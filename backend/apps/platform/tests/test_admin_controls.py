"""Three controls a Super Admin asked for, and what they have to do to be real.

- **Require 2FA for admins.** Two-factor was per-admin opt-in, so it could not be
  required of anyone. An admin account can refund money, delete a student and
  message the whole platform.
- **Pause payments.** The only way to stop taking money was to remove the
  Paystack key and redeploy — no use during an outage or a pricing mistake.
- **A reply target for support.** The queue had no sense of time in it: nothing
  told a student when to expect an answer, and nothing told an admin which
  tickets had been sitting too long.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.notifications.models import SupportTicket, SupportTicketMessage
from apps.platform.models import PlatformSettings
from common.rbac import SUPER_ADMIN

from .test_audit_and_settings import client_for, make_user


def configure(**values):
    settings_row = PlatformSettings.get_solo()
    for field, value in values.items():
        setattr(settings_row, field, value)
    settings_row.save()
    return settings_row


@pytest.fixture
def super_admin(db):
    return make_user("admin", SUPER_ADMIN, email="boss@test.dev")


class TestRequireTwoFactorForAdmins:
    def test_an_admin_must_use_a_code_even_if_they_never_turned_it_on(self, super_admin):
        configure(require_admin_two_factor=True)
        assert super_admin.two_factor_enabled is False

        response = APIClient().post(
            "/api/auth/login/", {"email": super_admin.email, "password": "pass12345"}, format="json"
        )

        assert response.status_code == 200
        assert response.json()["twoFactorRequired"] is True
        assert "accessToken" not in response.json()

    def test_students_are_not_dragged_into_it(self, db):
        configure(require_admin_two_factor=True)
        student = make_user("student", email="learner@test.dev")

        response = APIClient().post(
            "/api/auth/login/", {"email": student.email, "password": "pass12345"}, format="json"
        )

        assert response.status_code == 200
        assert response.json().get("twoFactorRequired") is not True

    def test_an_admin_cannot_switch_their_own_off_while_it_is_required(self, super_admin):
        configure(require_admin_two_factor=True)

        response = client_for(super_admin).post(
            "/api/auth/two-factor/", {"enabled": False}, format="json"
        )

        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()

    def test_without_the_rule_it_stays_a_personal_choice(self, super_admin):
        configure(require_admin_two_factor=False)

        response = APIClient().post(
            "/api/auth/login/", {"email": super_admin.email, "password": "pass12345"}, format="json"
        )

        assert response.json().get("twoFactorRequired") is not True


class TestPausePayments:
    @pytest.fixture
    def paid_course(self, db):
        from apps.accounts.models import StudentProfile, TeacherProfile, User
        from apps.categories.models import Category, Subcategory
        from apps.courses.models import Course

        teacher_user = User.objects.create_user(
            email="t@t.dev", username="t", display_name="T", password="pass12345", role="teacher"
        )
        teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
        category = Category.objects.create(name="Web")
        subcategory = Subcategory.objects.create(category=category, name="React")
        course = Course.objects.create(
            teacher=teacher, category=category, subcategory=subcategory, title="Paid", subtitle="s",
            overview="o", scheme_of_work="w", status="published", visibility="visible",
            price=Decimal("10000"),
        )
        student_user = User.objects.create_user(
            email="s@t.dev", username="s", display_name="S", password="pass12345", role="student"
        )
        student = StudentProfile.objects.create(
            user=student_user, selected_interest="Web", selected_track="React"
        )
        return {"course": course, "student": student, "user": student_user}

    def test_checkout_refuses_while_payments_are_paused(self, paid_course):
        configure(payments_enabled=False)

        with patch("apps.payments.paystack.initialize_transaction") as never_called:
            response = client_for(paid_course["user"]).post(
                "/api/payments/initialize/",
                {"course_id": str(paid_course["course"].id), "payment_method": "paystack"},
                format="json",
            )

        assert response.status_code == 400
        assert never_called.call_count == 0
        assert "paused" in str(response.json()).lower()

    def test_students_are_told_before_they_try(self, paid_course):
        configure(payments_enabled=False)
        status_payload = APIClient().get("/api/platform/status/").json()
        assert status_payload["paymentsEnabled"] is False

    def test_free_courses_are_unaffected(self, paid_course):
        configure(payments_enabled=False)
        paid_course["course"].price = 0
        paid_course["course"].save(update_fields=["price"])

        response = client_for(paid_course["user"]).post(
            f"/api/courses/{paid_course['course'].id}/enroll/"
        )

        assert response.status_code == 201

    def test_refunds_still_work_while_paused(self, paid_course, db):
        """Pausing intake must not trap money that ought to go back."""
        from apps.enrollments.models import Enrollment
        from apps.payments.models import Payment, Transaction

        configure(payments_enabled=False)
        payment = Payment.objects.create(
            student=paid_course["student"], course=paid_course["course"], amount=Decimal("10000"),
            payment_method="paystack", status="successful", description="x",
            paid_at=timezone.now(), mode="test",
        )
        Transaction.objects.create(payment=payment, provider="paystack", reference="MSU-P1", amount=10000)
        Enrollment.objects.create(
            student=paid_course["student"], course=paid_course["course"], access_source="payment"
        )
        admin = make_user("admin", SUPER_ADMIN, email="refunder@test.dev")

        response = client_for(admin).post(
            f"/api/admin/payments/{payment.id}/refund/", {"reason": "Course pulled"}, format="json"
        )

        assert response.status_code == 200


class TestSupportReplyTarget:
    @pytest.fixture
    def ticket(self, db):
        student = make_user("student", email="asker@test.dev")
        return {
            "student": student,
            "admin": make_user("admin", SUPER_ADMIN, email="helper@test.dev"),
            "row": SupportTicket.objects.create(
                created_by=student, category="technical", title="Stuck", description="Help"
            ),
        }

    def age(self, ticket, hours):
        SupportTicket.objects.filter(id=ticket["row"].id).update(
            created_at=timezone.now() - timedelta(hours=hours)
        )

    def test_a_ticket_past_the_target_is_flagged(self, ticket):
        configure(support_response_hours=24)
        self.age(ticket, 30)

        rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()

        assert rows[0]["isOverdue"] is True
        assert rows[0]["hoursWaiting"] >= 30

    def test_a_fresh_ticket_is_not(self, ticket):
        configure(support_response_hours=24)
        self.age(ticket, 2)

        rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()
        assert rows[0]["isOverdue"] is False

    def test_replying_stops_the_clock(self, ticket):
        configure(support_response_hours=24)
        self.age(ticket, 30)
        SupportTicketMessage.objects.create(
            ticket=ticket["row"], body="On it.", is_internal=False, author_name="Support"
        )

        rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()
        assert rows[0]["isOverdue"] is False

    def test_an_internal_note_is_not_a_reply(self, ticket):
        """Talking among ourselves is not answering the person waiting."""
        configure(support_response_hours=24)
        self.age(ticket, 30)
        SupportTicketMessage.objects.create(
            ticket=ticket["row"], body="Who owns this?", is_internal=True, author_name="Support"
        )

        rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()
        assert rows[0]["isOverdue"] is True

    def test_zero_hours_means_we_promise_nothing(self, ticket):
        configure(support_response_hours=0)
        self.age(ticket, 500)

        rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()
        assert rows[0]["isOverdue"] is False
        assert APIClient().get("/api/platform/status/").json()["supportResponseHours"] == 0

    def test_students_are_told_what_to_expect(self, ticket):
        configure(support_response_hours=12)
        assert APIClient().get("/api/platform/status/").json()["supportResponseHours"] == 12
