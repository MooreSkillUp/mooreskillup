"""What the money screens say, and what a refund actually takes away.

- A refund marked the enrolment "revoked", but every access check only asked
  whether an enrolment existed. The refunded student kept the whole course.
- The same check then refused to sell them the course again: "already unlocked".
- Revenue summed every successful payment. Nothing recorded whether Paystack ran
  with a live key, a test key or no key at all, so test checkouts were reported
  as money the business had taken.
- With no key and DEBUG off, the webhook accepted any signature at all.
- A checkout Paystack refused still left a pending payment behind.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.certificates.models import Certificate
from apps.courses.models import Lesson, Section
from apps.enrollments.models import Enrollment
from apps.payments import paystack
from apps.payments.models import Payment, Transaction
from apps.payments.views import fulfill_payment
from common.rbac import SUPER_ADMIN

from .test_paystack import client_for, make_course, make_student


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def paid(db):
    """A student who has bought a paid course, with one paid lesson in it."""
    course = make_course(price=10000)
    section = Section.objects.create(
        course=course, title="Paid", description="d", order=1, is_published=True, access_type="paid"
    )
    lesson = Lesson.objects.create(
        section=section, title="L", content_type="text", text_content="secret", order=1, is_published=True
    )
    student = make_student()
    payment = Payment.objects.create(
        student=student, course=course, amount=Decimal("10000"), currency="NGN",
        payment_method="paystack", status="successful", description="x",
        paid_at=timezone.now(), mode="live",
    )
    Transaction.objects.create(payment=payment, provider="paystack", reference="MSU-PAID1", amount=10000)
    Enrollment.objects.create(student=student, course=course, access_source="payment")
    admin = User.objects.create_user(
        email="super@t.dev", username="super", display_name="Super", password="pass12345",
        role="admin", admin_role=SUPER_ADMIN,
    )
    return {"course": course, "lesson": lesson, "student": student, "payment": payment, "admin": admin}


def refund(paid, reason="Asked within the window"):
    with patch("apps.payments.paystack.create_refund", return_value={"success": True, "raw": {}}):
        return client_for(paid["admin"]).post(
            f"/api/admin/payments/{paid['payment'].id}/refund/", {"reason": reason}, format="json"
        )


def test_a_refunded_student_loses_the_course(paid):
    client = client_for(paid["student"].user)
    lesson_url = f"/api/student/lessons/{paid['lesson'].id}/"
    assert client.get(lesson_url).json()["canAccess"] is True

    assert refund(paid).status_code == 200

    lesson = client.get(lesson_url).json()
    assert lesson["canAccess"] is False
    assert lesson["isEnrolled"] is False
    assert lesson["lesson"]["textContent"] == ""
    course = client.get(f"/api/courses/{paid['course'].id}/").json()
    assert course["isOwned"] is False
    progress = client.post(f"/api/progress/lessons/{paid['lesson'].id}/", {"status": "completed"}, format="json")
    assert progress.status_code in (403, 404)
    assert not [row for row in client.get("/api/my-courses/").json() if row["course"]["id"] == str(paid["course"].id)]


def test_a_refunded_student_can_buy_the_course_again(paid):
    refund(paid)
    with patch(
        "apps.payments.paystack.initialize_transaction",
        return_value={"authorization_url": "https://checkout.paystack.com/x", "reference": "MSU-AGAIN"},
    ):
        response = client_for(paid["student"].user).post(
            "/api/payments/initialize/",
            {"course_id": str(paid["course"].id), "payment_method": "paystack"},
            format="json",
        )
    assert response.status_code == 201

    again = Payment.objects.get(transactions__reference="MSU-AGAIN")
    fulfill_payment(again, again.transactions.get())
    enrollment = Enrollment.objects.get(student=paid["student"], course=paid["course"])
    assert enrollment.status == "active"


def test_the_refund_is_recorded_on_the_payment_and_ends_the_certificate(paid):
    enrollment = Enrollment.objects.get(student=paid["student"])
    certificate = Certificate.objects.create(
        student=paid["student"], course=paid["course"], enrollment=enrollment, certificate_code="MSU-REFUND01"
    )

    refund(paid, reason="Charged twice")

    payment = Payment.objects.get(id=paid["payment"].id)
    assert payment.refund_reason == "Charged twice"
    assert payment.refunded_by == paid["admin"]
    assert payment.refunded_at is not None
    certificate.refresh_from_db()
    assert certificate.is_revoked is True
    assert APIClient().get("/api/certificates/verify/MSU-REFUND01/").json()["valid"] is False


def test_a_test_payment_is_reversed_without_asking_paystack(paid):
    """Paystack never charged it, so it has nothing to send back.

    Refunding one asked Paystack to reverse a reference it had never seen, which
    failed with a 502 — an admin could not undo a purchase the platform had
    recorded itself.
    """
    Payment.objects.filter(id=paid["payment"].id).update(mode="test")

    with patch("apps.payments.paystack.create_refund") as never_called:
        response = client_for(paid["admin"]).post(
            f"/api/admin/payments/{paid['payment'].id}/refund/", {"reason": "Test purchase"}, format="json"
        )

    assert response.status_code == 200
    assert never_called.call_count == 0
    assert Payment.objects.get(id=paid["payment"].id).status == "refunded"
    assert Enrollment.objects.get(student=paid["student"]).status == "revoked"


def test_revenue_counts_only_live_money(paid):
    other = make_student("tester@t.dev")
    for mode in ("test", "simulated"):
        Payment.objects.create(
            student=other, course=paid["course"], amount=Decimal("8999"), currency="NGN",
            payment_method="paystack", status="successful", description="x",
            paid_at=timezone.now(), mode=mode,
        )

    totals = client_for(paid["admin"]).get("/api/dashboard/admin/").json()["totals"]
    assert Decimal(totals["revenue"]) == Decimal("10000")
    assert totals["payments"] == 1
    assert totals["payingStudents"] == 1
    assert Decimal(totals["testRevenue"]) == Decimal("17998")


def test_refunded_money_is_not_revenue(paid):
    refund(paid)
    totals = client_for(paid["admin"]).get("/api/dashboard/admin/").json()["totals"]
    assert Decimal(totals["revenue"]) == Decimal("0")


def test_the_revenue_chart_gives_each_month_once(paid):
    months = client_for(paid["admin"]).get("/api/dashboard/admin/").json()["analytics"]["revenue"]
    labels = [row["label"] for row in months]
    assert len(labels) == 6
    assert len(set(labels)) == 6
    assert months[-1]["revenue"] == 10000


@pytest.mark.parametrize(
    ("key", "debug", "expected"),
    [("sk_live_abc", False, "live"), ("sk_test_abc", False, "test"), ("", True, "simulated")],
)
def test_each_payment_records_how_it_was_taken(key, debug, expected, db):
    course = make_course()
    student = make_student()
    with override_settings(PAYSTACK_SECRET_KEY=key, DEBUG=debug), patch(
        "apps.payments.paystack._request",
        return_value={"status": True, "data": {"authorization_url": "https://checkout.paystack.com/x", "reference": "R"}},
    ):
        response = client_for(student.user).post(
            "/api/payments/initialize/", {"course_id": str(course.id), "payment_method": "paystack"}, format="json"
        )
    assert response.status_code == 201
    assert Payment.objects.get().mode == expected


@override_settings(PAYSTACK_SECRET_KEY="", DEBUG=False)
def test_without_a_key_the_webhook_trusts_no_signature(paid):
    pending = Payment.objects.create(
        student=paid["student"], course=make_course_for_webhook(), amount=Decimal("5000"),
        payment_method="paystack", status="pending", description="x",
    )
    Transaction.objects.create(payment=pending, provider="paystack", reference="MSU-FORGED", amount=5000)

    response = APIClient().post(
        "/api/payments/webhooks/paystack/",
        {"event": "charge.success", "data": {"reference": "MSU-FORGED", "amount": 500000}},
        format="json",
        HTTP_X_PAYSTACK_SIGNATURE="anything",
    )
    assert response.status_code == 401
    pending.refresh_from_db()
    assert pending.status == "pending"


def make_course_for_webhook():
    from apps.courses.models import Course

    template = Course.objects.first()
    return Course.objects.create(
        teacher=template.teacher, category=template.category, subcategory=template.subcategory,
        title="Second", subtitle="s", overview="o", scheme_of_work="w",
        status="published", visibility="visible", price=5000,
    )


def test_a_checkout_paystack_refuses_leaves_no_payment_behind(db):
    course = make_course()
    student = make_student()
    with patch("apps.payments.paystack.initialize_transaction", side_effect=paystack.PaystackError("Down")):
        response = client_for(student.user).post(
            "/api/payments/initialize/", {"course_id": str(course.id), "payment_method": "paystack"}, format="json"
        )
    assert response.status_code == 502
    assert not Payment.objects.exists()


def test_admin_list_is_one_row_per_payment_with_the_truth_about_it(paid):
    stale = Payment.objects.create(
        student=make_student("walked@t.dev"), course=paid["course"], amount=Decimal("10000"),
        payment_method="paystack", status="pending", description="x", mode="test",
    )
    Payment.objects.filter(id=stale.id).update(created_at=timezone.now() - timedelta(days=2))
    Transaction.objects.create(payment=stale, provider="paystack", reference="MSU-WALK1", amount=10000)
    Transaction.objects.create(payment=stale, provider="paystack", reference="MSU-WALK2", amount=10000)

    rows = client_for(paid["admin"]).get("/api/admin/transactions/").json()
    assert len(rows) == 2
    walked = next(row for row in rows if row["paymentId"] == str(stale.id))
    assert walked["state"] == "abandoned"
    assert walked["mode"] == "test"
    assert walked["reference"] == "MSU-WALK2"
    bought = next(row for row in rows if row["paymentId"] == str(paid["payment"].id))
    assert bought["state"] == "paid"
    assert bought["refund"]["eligible"] is True
