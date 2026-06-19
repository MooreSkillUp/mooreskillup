"""Phase 4: real Paystack flow — initialize, verify (server-side), webhook
signature, amount tampering guard, refunds, idempotency."""

import hashlib
import hmac
import json

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment, Transaction
from common.rbac import ADMIN, SUPER_ADMIN


def make_student(email="s@t.dev"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="Stu", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")


def make_course(price=10000, discount=None):
    teacher_user = User.objects.create_user(
        email="teach@t.dev", username="teach", display_name="T", password="pass12345", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return Course.objects.create(
        teacher=teacher, category=category, subcategory=subcategory, title="Paid Course", subtitle="s",
        overview="o", scheme_of_work="w", status="published", visibility="visible",
        price=price, discount_price=discount,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def db_setup(db):
    return True


class TestInitialize:
    def test_initialize_creates_pending_payment(self, db_setup):
        course = make_course(price=10000)
        student = make_student()
        res = client_for(student.user).post(
            "/api/payments/initialize/",
            {"course_id": str(course.id), "payment_method": "paystack", "callback_url": "http://localhost:3000/payment/callback"},
            format="json",
        )
        assert res.status_code == 201
        assert res.json()["authorization_url"]  # sim mode → callback url
        payment = Payment.objects.get()
        assert payment.status == "pending"
        assert payment.amount == 10000

    def test_initialize_uses_discount_price(self, db_setup):
        course = make_course(price=10000, discount=6000)
        student = make_student()
        client_for(student.user).post(
            "/api/payments/initialize/",
            {"course_id": str(course.id), "payment_method": "paystack"},
            format="json",
        )
        assert Payment.objects.get().amount == 6000

    def test_free_course_rejected(self, db_setup):
        course = make_course(price=0)
        student = make_student()
        res = client_for(student.user).post(
            "/api/payments/initialize/", {"course_id": str(course.id), "payment_method": "paystack"}, format="json"
        )
        assert res.status_code == 400


class TestVerify:
    def test_verify_simulation_unlocks_and_is_idempotent(self, db_setup):
        course = make_course(price=10000)
        student = make_student()
        client_for(student.user).post(
            "/api/payments/initialize/", {"course_id": str(course.id), "payment_method": "paystack"}, format="json"
        )
        ref = Transaction.objects.get().reference

        res = client_for(student.user).post("/api/payments/verify/", {"reference": ref}, format="json")
        assert res.status_code == 200
        assert res.json()["course_unlocked"] is True
        assert Enrollment.objects.filter(student=student, course=course).count() == 1

        # Second verify: still exactly one enrollment, still successful.
        client_for(student.user).post("/api/payments/verify/", {"reference": ref}, format="json")
        assert Enrollment.objects.filter(student=student, course=course).count() == 1
        assert Payment.objects.get().status == "successful"

    def test_cannot_verify_another_students_transaction(self, db_setup):
        course = make_course()
        student = make_student("a@t.dev")
        client_for(student.user).post(
            "/api/payments/initialize/", {"course_id": str(course.id), "payment_method": "paystack"}, format="json"
        )
        ref = Transaction.objects.get().reference
        other = make_student("b@t.dev")
        res = client_for(other.user).post("/api/payments/verify/", {"reference": ref}, format="json")
        assert res.status_code == 403


SECRET = "sk_test_dummysecret"


def _signed_webhook(payload):
    body = json.dumps(payload)
    sig = hmac.new(SECRET.encode(), body.encode(), hashlib.sha512).hexdigest()
    return APIClient().post(
        "/api/payments/webhooks/paystack/",
        data=body,
        content_type="application/json",
        HTTP_X_PAYSTACK_SIGNATURE=sig,
    )


def _seed_pending():
    course = make_course(price=10000)
    student = make_student()
    payment = Payment.objects.create(
        student=student, course=course, amount=10000, currency="NGN",
        payment_method="paystack", status="pending", description="x",
    )
    Transaction.objects.create(
        payment=payment, provider="paystack", reference="MSU-ABC123", amount=10000, currency="NGN",
    )
    return course, student, payment


class TestWebhook:
    def test_valid_signature_charge_success_fulfills(self, settings, db_setup):
        settings.PAYSTACK_SECRET_KEY = SECRET
        course, student, payment = _seed_pending()
        res = _signed_webhook({"event": "charge.success", "data": {"reference": "MSU-ABC123", "amount": 1000000}})
        assert res.status_code == 200
        payment.refresh_from_db()
        assert payment.status == "successful"
        assert Enrollment.objects.filter(student=student, course=course).exists()

    def test_bad_signature_rejected(self, settings, db_setup):
        settings.PAYSTACK_SECRET_KEY = SECRET
        _seed_pending()
        res = APIClient().post(
            "/api/payments/webhooks/paystack/",
            data=json.dumps({"event": "charge.success", "data": {"reference": "MSU-ABC123", "amount": 1000000}}),
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE="wrong",
        )
        assert res.status_code == 401
        assert Payment.objects.get().status == "pending"

    def test_amount_tampering_does_not_fulfill(self, settings, db_setup):
        settings.PAYSTACK_SECRET_KEY = SECRET
        course, student, payment = _seed_pending()
        # Webhook reports a far smaller amount than charged → ignored.
        _signed_webhook({"event": "charge.success", "data": {"reference": "MSU-ABC123", "amount": 100}})
        payment.refresh_from_db()
        assert payment.status == "pending"
        assert not Enrollment.objects.filter(student=student, course=course).exists()


class TestRefund:
    def _make_admin(self, role, email):
        return User.objects.create_user(
            email=email, username=email.split("@")[0], display_name="A", password="pass12345",
            role="admin", admin_role=role,
        )

    def test_super_admin_refunds_and_revokes_access(self, db_setup):
        course = make_course(price=10000)
        student = make_student()
        payment = Payment.objects.create(
            student=student, course=course, amount=10000, currency="NGN",
            payment_method="paystack", status="successful", description="x",
        )
        Transaction.objects.create(payment=payment, provider="paystack", reference="MSU-REF1", amount=10000, currency="NGN")
        enrollment = Enrollment.objects.create(student=student, course=course, access_source="payment")

        admin = self._make_admin(SUPER_ADMIN, "super@t.dev")
        res = client_for(admin).post(
            f"/api/admin/payments/{payment.id}/refund/", {"reason": "Student requested"}, format="json"
        )
        assert res.status_code == 200
        payment.refresh_from_db()
        enrollment.refresh_from_db()
        assert payment.status == "refunded"
        assert enrollment.status == "revoked"

    def test_regular_admin_cannot_refund(self, db_setup):
        course = make_course()
        student = make_student()
        payment = Payment.objects.create(
            student=student, course=course, amount=10000, currency="NGN",
            payment_method="paystack", status="successful", description="x",
        )
        admin = self._make_admin(ADMIN, "admin@t.dev")
        res = client_for(admin).post(f"/api/admin/payments/{payment.id}/refund/", {"reason": "x"}, format="json")
        assert res.status_code == 403

    def test_refund_requires_reason(self, db_setup):
        course = make_course()
        student = make_student()
        payment = Payment.objects.create(
            student=student, course=course, amount=10000, currency="NGN",
            payment_method="paystack", status="successful", description="x",
        )
        Transaction.objects.create(payment=payment, provider="paystack", reference="MSU-R2", amount=10000, currency="NGN")
        Enrollment.objects.create(student=student, course=course, access_source="payment")
        admin = self._make_admin(SUPER_ADMIN, "super2@t.dev")
        res = client_for(admin).post(f"/api/admin/payments/{payment.id}/refund/", {}, format="json")
        assert res.status_code == 400

    def test_refund_blocked_over_progress_cap(self, db_setup):
        from apps.progress.models import CourseProgress

        course = make_course()
        student = make_student()
        payment = Payment.objects.create(
            student=student, course=course, amount=10000, currency="NGN",
            payment_method="paystack", status="successful", description="x",
        )
        enrollment = Enrollment.objects.create(student=student, course=course, access_source="payment")
        CourseProgress.objects.create(enrollment=enrollment, progress_percent=80, total_lessons_count=10, completed_lessons_count=8)
        admin = self._make_admin(SUPER_ADMIN, "super3@t.dev")
        res = client_for(admin).post(f"/api/admin/payments/{payment.id}/refund/", {"reason": "x"}, format="json")
        assert res.status_code == 400
        assert "capped" in res.json()["detail"].lower()
