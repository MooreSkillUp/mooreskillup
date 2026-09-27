"""The Revenue Split endpoints: reading a month, recording costs, closing it.

The behaviour worth guarding is the difference between an open month and a
closed one. An open month is worked out afresh on every read, so the screen
moves as sales come in. A closed month is read back from what was stored, and
nothing — not a new sale, not a late cost entry, not an edited percentage — may
change it afterwards.
"""

from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.finance.models import FOUNDING, TeacherTerms
from apps.finance.revenue_models import CostEntry, SplitPolicy
from apps.organization.models import Department
from apps.payments.models import Payment
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN

MONTH = date(2026, 11, 1)


def user_for(role, admin_role=None, email=None):
    email = email or f"{admin_role or role}@rev.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=(admin_role or role).replace("_", " ").title(),
        password="x",
        role=role,
        **({"admin_role": admin_role} if admin_role else {}),
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def boss(db):
    return client_for(user_for("admin", SUPER_ADMIN))


@pytest.fixture
def tech(db):
    return Department.objects.create(
        name="Technology & Product", percent_of_pool=Decimal("55"), order=1
    )


@pytest.fixture
def infra(db):
    return Department.objects.create(
        name="Infrastructure", percent_of_pool=Decimal("45"), is_cost_floor=True, order=2
    )


def a_sale(amount="20000", fee="400", day=10):
    teacher_user = user_for("teacher", email=f"t{day}@rev.dev")
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Tech", track="Python")
    TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
    category, _ = Category.objects.get_or_create(name="Programming")
    subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Python")
    course = Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title=f"Course {day}",
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        price=Decimal("25000"),
    )
    course.status = "published"
    course.visibility = "visible"
    course.published_at = timezone.make_aware(timezone.datetime(2026, 11, 1, 1, 0))
    course.save()

    student_user = user_for("student", email=f"s{day}@rev.dev")
    student = StudentProfile.objects.create(user=student_user)
    return Payment.objects.create(
        student=student,
        course=course,
        amount=Decimal(amount),
        processor_fee=Decimal(fee),
        currency="NGN",
        payment_method="paystack",
        status="successful",
        mode="live",
        description="x",
        paid_at=timezone.make_aware(timezone.datetime(2026, 11, day, 12, 0)),
    )


@pytest.fixture
def policy(db):
    return SplitPolicy.objects.create(
        effective_from=date(2026, 1, 1), operations_percent=Decimal("55.00")
    )


class TestReadingAMonth:
    def test_an_open_month_is_worked_out_live(self, boss, policy, tech, infra, db):
        a_sale()

        res = boss.get("/api/admin/revenue-split/?month=2026-11")

        assert res.status_code == 200
        assert res.data["live"] is True
        assert res.data["status"] == "open"
        assert res.data["netRevenue"] == "19600.00"
        assert res.data["teacherTotal"] == "4900.00"
        assert res.data["operationsPool"] == "10780.00"
        assert len(res.data["allocations"]) == 2

    def test_it_lists_the_teachers_and_the_sales_behind_each_figure(self, boss, policy, db):
        a_sale(day=4)

        res = boss.get("/api/admin/revenue-split/?month=2026-11")

        assert res.data["teachers"][0]["total"] == "4900.00"
        assert res.data["teachers"][0]["sales"][0]["sharePercent"] == "25.00"
        assert res.data["teachers"][0]["sales"][0]["earned"] == "4900.00"

    def test_a_bad_month_is_refused(self, boss, db):
        assert boss.get("/api/admin/revenue-split/?month=november").status_code == 400

    def test_the_months_with_activity_are_listed(self, boss, policy, db):
        a_sale()
        res = boss.get("/api/admin/revenue-split/?month=2026-11")
        assert "2026-11" in res.data["months"]


class TestClosingAMonth:
    def test_closing_freezes_the_figures(self, boss, policy, tech, infra, db):
        a_sale(day=3)

        closed = boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")

        assert closed.status_code == 200
        assert closed.data["status"] == "closed"
        assert closed.data["netRevenue"] == "19600.00"

    def test_a_later_sale_does_not_change_a_closed_month(self, boss, policy, tech, infra, db):
        a_sale(day=3)
        boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")

        a_sale(day=20)
        res = boss.get("/api/admin/revenue-split/?month=2026-11")

        assert res.data["live"] is False
        assert res.data["saleCount"] == 1
        assert res.data["netRevenue"] == "19600.00"

    def test_a_month_cannot_be_closed_twice(self, boss, policy, tech, db):
        boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")

        again = boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")

        assert again.status_code == 400
        assert "already closed" in str(again.data)

    def test_closing_records_who_did_it(self, boss, policy, tech, db):
        res = boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")
        assert res.data["closedAt"] is not None
        assert res.data["closedBy"] == "Super Admin"


class TestCosts:
    def test_a_cost_is_recorded_against_a_department(self, boss, infra, db):
        res = boss.post(
            "/api/admin/costs/",
            {
                "month": "2026-11-01",
                "departmentId": str(infra.id),
                "category": "hosting",
                "amount": "120000",
                "vendor": "Azure",
            },
            format="json",
        )

        assert res.status_code == 201
        entry = CostEntry.objects.get()
        assert entry.amount == Decimal("120000")
        assert entry.entered_by is not None

    def test_a_negative_cost_is_refused(self, boss, infra, db):
        res = boss.post(
            "/api/admin/costs/",
            {"month": "2026-11-01", "departmentId": str(infra.id), "amount": "-5000"},
            format="json",
        )
        assert res.status_code == 400

    def test_costs_cannot_be_added_to_a_closed_month(self, boss, policy, infra, db):
        """A closed month's figures are what somebody has already been shown."""
        boss.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json")

        res = boss.post(
            "/api/admin/costs/",
            {"month": "2026-11-01", "departmentId": str(infra.id), "amount": "5000"},
            format="json",
        )

        assert res.status_code == 400
        assert "closed" in str(res.data)

    def test_costs_can_be_filtered_by_month(self, boss, infra, db):
        CostEntry.objects.create(
            month=MONTH, department=infra, category="hosting", amount=Decimal("100")
        )
        CostEntry.objects.create(
            month=date(2026, 12, 1), department=infra, category="hosting", amount=Decimal("200")
        )

        res = boss.get("/api/admin/costs/?month=2026-11")

        assert len(res.data) == 1
        assert res.data[0]["amount"] == "100.00"

    def test_the_cost_shows_up_in_the_split(self, boss, policy, tech, infra, db):
        a_sale()
        CostEntry.objects.create(
            month=MONTH, department=infra, category="hosting", amount=Decimal("50000")
        )

        res = boss.get("/api/admin/revenue-split/?month=2026-11")
        row = next(a for a in res.data["allocations"] if a["department"] == "Infrastructure")

        assert row["costTotal"] == "50000.00"
        assert row["actual"] == "50000.00"
        assert Decimal(row["reserveDraw"]) > 0


class TestPolicy:
    def test_a_policy_can_be_recorded(self, boss, db):
        res = boss.post(
            "/api/admin/split-policies/",
            {"effectiveFrom": "2026-11-01", "operationsPercent": "55.00"},
            format="json",
        )
        assert res.status_code == 201
        assert SplitPolicy.objects.get().created_by is not None


class TestWhoMaySeeAndDoWhat:
    def test_an_admin_may_read_the_split_but_not_close_it(self, policy, tech, db):
        ops = client_for(user_for("admin", ADMIN, "ops@rev.dev"))

        assert ops.get("/api/admin/revenue-split/?month=2026-11").status_code == 200
        assert (
            ops.post("/api/admin/revenue-split/", {"month": "2026-11"}, format="json").status_code
            == 403
        )

    def test_a_moderator_sees_none_of_it(self, policy, db):
        mod = client_for(user_for("admin", MODERATOR, "mod@rev.dev"))

        assert mod.get("/api/admin/revenue-split/?month=2026-11").status_code == 403
        assert mod.get("/api/admin/costs/").status_code == 403

    def test_a_teacher_sees_none_of_it(self, policy, db):
        teacher = client_for(user_for("teacher", email="nosy@rev.dev"))
        assert teacher.get("/api/admin/revenue-split/?month=2026-11").status_code == 403
