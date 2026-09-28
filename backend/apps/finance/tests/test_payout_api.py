"""The payout endpoints: running a month, approving, paying, and what a teacher sees.

The boundaries matter as much as the arithmetic. A teacher sees their own
earnings and nobody else's. A moderator sees none of it. Only a Super Admin
approves a payout, records a transfer, or reads an account number — and the
number itself leaves through exactly one endpoint, which is audited.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.finance.models import FOUNDING, TeacherTerms
from apps.finance.payout_models import EarningLine, Payout, TeacherPayoutDetail
from apps.finance.payouts import generate, record_earnings
from apps.payments.models import Payment
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN


def a_user(role, email, **extra):
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=email.split("@")[0].title(),
        password="x",
        role=role,
        **extra,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def a_teacher(email="ada@api.dev"):
    teacher = TeacherProfile.objects.create(
        user=a_user("teacher", email), program="Tech", track="Python"
    )
    TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
    return teacher


def a_sale_for(teacher, days_ago=30, title="Python"):
    category, _ = Category.objects.get_or_create(name="Programming")
    subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Python")
    course = Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title=title,
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        price=Decimal("25000"),
    )
    course.status = "published"
    course.visibility = "visible"
    course.published_at = timezone.now() - timedelta(days=90)
    course.save()

    student = StudentProfile.objects.create(
        user=a_user("student", f"s{Payment.objects.count()}@api.dev")
    )
    return Payment.objects.create(
        student=student,
        course=course,
        amount=Decimal("20000"),
        processor_fee=Decimal("400"),
        currency="NGN",
        payment_method="paystack",
        status="successful",
        mode="live",
        description="x",
        paid_at=timezone.now() - timedelta(days=days_ago),
    )


@pytest.fixture
def boss(db):
    return client_for(a_user("admin", "boss@api.dev", admin_role=SUPER_ADMIN))


class TestRunningAMonth:
    def test_the_run_records_earnings_and_builds_payouts(self, boss, db):
        teacher = a_teacher()
        a_sale_for(teacher)
        period = (timezone.now() - timedelta(days=16)).strftime("%Y-%m")

        res = boss.post("/api/admin/payouts/", {"period": period}, format="json")

        assert res.status_code == 200
        assert res.data["newLines"] == 1
        assert res.data["nowPayable"] == 1
        assert res.data["payouts"] == 1

    def test_running_it_twice_is_safe(self, boss, db):
        a_sale_for(a_teacher())
        period = (timezone.now() - timedelta(days=16)).strftime("%Y-%m")

        boss.post("/api/admin/payouts/", {"period": period}, format="json")
        second = boss.post("/api/admin/payouts/", {"period": period}, format="json")

        assert second.data["newLines"] == 0
        assert Payout.objects.count() == 1

    def test_the_listing_shows_what_each_figure_is_made_of(self, boss, db):
        teacher = a_teacher()
        a_sale_for(teacher)
        record_earnings()
        period = EarningLine.objects.first().period
        generate(period)

        res = boss.get(f"/api/admin/payouts/?period={period}")

        assert res.status_code == 200
        payout = res.data["payouts"][0]
        assert payout["teacherName"] == "Ada"
        assert payout["amount"] == "4900.00"
        assert payout["lines"][0]["sharePercent"] == "25.00"
        assert payout["bank"]["onFile"] is False

    def test_the_totals_separate_owed_from_paid(self, boss, db):
        a_sale_for(a_teacher())
        record_earnings()
        period = EarningLine.objects.first().period
        generate(period)

        res = boss.get(f"/api/admin/payouts/?period={period}")

        assert res.data["totals"]["owed"] == "4900.00"
        assert res.data["totals"]["paid"] == "0"


class TestApprovingAndPaying:
    def _payout(self, verified=True):
        teacher = a_teacher()
        TeacherPayoutDetail.objects.create(
            teacher=teacher,
            account_name="Ada Obi",
            bank_name="GTBank",
            account_number="0123456789",
            verified_at=timezone.now() if verified else None,
        )
        a_sale_for(teacher)
        record_earnings()
        generate(EarningLine.objects.first().period)
        return Payout.objects.get()

    def test_approve_then_pay(self, boss, db):
        payout = self._payout()

        approved = boss.post(
            f"/api/admin/payouts/{payout.id}/action/", {"action": "approve"}, format="json"
        )
        assert approved.status_code == 200
        assert approved.data["status"] == "approved"

        paid = boss.post(
            f"/api/admin/payouts/{payout.id}/action/",
            {"action": "pay", "reference": "TRF-4410"},
            format="json",
        )
        assert paid.status_code == 200
        assert paid.data["status"] == "paid"
        assert paid.data["reference"] == "TRF-4410"

    def test_unverified_details_block_approval(self, boss, db):
        payout = self._payout(verified=False)

        res = boss.post(
            f"/api/admin/payouts/{payout.id}/action/", {"action": "approve"}, format="json"
        )

        assert res.status_code == 400
        assert "not been verified" in res.data["detail"]

    def test_an_unknown_action_is_refused(self, boss, db):
        payout = self._payout()
        res = boss.post(
            f"/api/admin/payouts/{payout.id}/action/", {"action": "delete"}, format="json"
        )
        assert res.status_code == 400

    def test_a_missing_payout_is_a_404(self, boss, db):
        import uuid

        res = boss.post(
            f"/api/admin/payouts/{uuid.uuid4()}/action/", {"action": "approve"}, format="json"
        )
        assert res.status_code == 404


class TestTeacherBankDetails:
    def test_saving_masks_the_audit_row_and_clears_verification(self, boss, db):
        teacher = a_teacher()

        res = boss.put(
            f"/api/admin/teachers/{teacher.id}/bank-details/",
            {"accountName": "Ada Obi", "bankName": "GTBank", "accountNumber": "0123456789"},
            format="json",
        )

        assert res.status_code == 200
        assert res.data["accountNumberMasked"].endswith("6789")
        assert "0123456789" not in str(res.data)
        change = teacher.payout_detail_changes.get(field="account_number")
        assert "0123456789" not in change.new_value

    def test_changing_it_clears_verification(self, boss, db):
        teacher = a_teacher()
        endpoint = f"/api/admin/teachers/{teacher.id}/bank-details/"
        boss.put(
            endpoint,
            {"accountName": "Ada", "bankName": "GTBank", "accountNumber": "0123456789"},
            format="json",
        )
        boss.post(endpoint, {}, format="json")
        assert TeacherPayoutDetail.objects.get().verified_at is not None

        boss.put(endpoint, {"accountNumber": "9876543210"}, format="json")

        assert TeacherPayoutDetail.objects.get().verified_at is None

    def test_a_short_number_is_refused(self, boss, db):
        teacher = a_teacher()
        res = boss.put(
            f"/api/admin/teachers/{teacher.id}/bank-details/",
            {"accountNumber": "123"},
            format="json",
        )
        assert res.status_code == 400

    def test_reading_the_number_needs_its_own_permission(self, db):
        teacher = a_teacher()
        ops = client_for(a_user("admin", "ops@api.dev", admin_role=ADMIN))

        res = ops.get(f"/api/admin/teachers/{teacher.id}/bank-details/")

        assert res.status_code == 403


class TestWhatATeacherSees:
    def test_a_teacher_sees_their_own_earnings(self, db):
        teacher = a_teacher()
        a_sale_for(teacher)
        record_earnings()

        res = client_for(teacher.user).get("/api/teacher/earnings/")

        assert res.status_code == 200
        assert res.data["summary"]["pending"] == "4900.00"
        assert res.data["courses"][0]["sharePercent"] == "25.00"
        assert res.data["courses"][0]["endsAt"] is not None

    def test_a_teacher_never_sees_another_teacher_s_figures(self, db):
        mine = a_teacher("mine@api.dev")
        theirs = a_teacher("theirs@api.dev")
        a_sale_for(mine, title="Mine")
        a_sale_for(theirs, title="Theirs")
        record_earnings()

        res = client_for(mine.user).get("/api/teacher/earnings/")

        titles = {line["course"] for line in res.data["lines"]}
        assert titles == {"Mine"}

    def test_a_student_cannot_reach_it(self, db):
        student = a_user("student", "nosy@api.dev")
        assert client_for(student).get("/api/teacher/earnings/").status_code == 403


class TestWhoMayDoWhat:
    def test_an_admin_may_look_but_not_approve(self, db):
        teacher = a_teacher()
        a_sale_for(teacher)
        record_earnings()
        period = EarningLine.objects.first().period
        payout = generate(period)[0]
        ops = client_for(a_user("admin", "ops2@api.dev", admin_role=ADMIN))

        assert ops.get(f"/api/admin/payouts/?period={period}").status_code == 200
        assert (
            ops.post(
                f"/api/admin/payouts/{payout.id}/action/", {"action": "approve"}, format="json"
            ).status_code
            == 403
        )
        assert ops.post("/api/admin/payouts/", {"period": period}, format="json").status_code == 403

    def test_a_moderator_sees_none_of_it(self, db):
        mod = client_for(a_user("admin", "mod@api.dev", admin_role=MODERATOR))
        assert mod.get("/api/admin/payouts/").status_code == 403
