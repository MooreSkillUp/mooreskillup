"""The monthly split, worked against real sales.

The shape being tested:

    gross − processor fees                        = net revenue
    each course's own agreed share                → its teacher
    a fixed share of net                          → the operations pool
    everything left                               → the company reserve
    the pool ÷ department percentages, then caps  → the departments

Two behaviours matter more than the rest, because getting them wrong loses
money quietly rather than loudly.

**Only live money earns.** Paystack test keys and simulated checkouts both
report success without anyone being charged. Every test purchase the team ever
made would otherwise become real revenue and a real payout.

**The reserve takes the difference.** The pool is a fixed share; the teachers
are paid whatever their own courses agreed. A course on 20% rather than 25%
leaves a gap, and that gap belongs to the company — not to the departments.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.finance.models import FOUNDING, STANDARD, CostEntry, RevenuePeriod, SplitPolicy, TeacherTerms
from apps.finance.split import compute, save_period, teacher_breakdown, unearned_reasons
from apps.organization.models import Department
from apps.payments.models import Payment

MONTH = date(2026, 11, 1)


def at(day, hour=12):
    return timezone.make_aware(timezone.datetime(2026, 11, day, hour, 0))


def make_teacher(email, agreement=FOUNDING):
    user = User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=email.split("@")[0].title(),
        password="x",
        role="teacher",
    )
    teacher = TeacherProfile.objects.create(user=user, program="Tech", track="Python")
    TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(agreement))
    return teacher


def publish(teacher, title, when=None):
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
    course.published_at = when or at(1, 0)
    course.save()
    return course


def sale(course, amount="20000", fee="400", day=10, mode="live", refunded=False):
    student_user = User.objects.create_user(
        email=f"s{Payment.objects.count()}{day}@t.dev",
        username=f"s{Payment.objects.count()}{day}",
        display_name="Student",
        password="x",
        role="student",
    )
    from apps.accounts.models import StudentProfile

    student = StudentProfile.objects.create(user=student_user)
    return Payment.objects.create(
        student=student,
        course=course,
        amount=Decimal(amount),
        processor_fee=None if fee is None else Decimal(fee),
        currency="NGN",
        payment_method="paystack",
        status="successful",
        mode=mode,
        description="x",
        paid_at=at(day),
        refunded_at=at(day + 1) if refunded else None,
    )


def departments():
    """The eight, at their agreed percentages."""
    spec = [
        ("Technology & Product", Decimal("22"), False),
        ("Infrastructure & Software", Decimal("18"), True),
        ("Video Production", Decimal("15"), False),
        ("Creative & Design", Decimal("10"), False),
        ("Content", Decimal("10"), False),
        ("Marketing & Social", Decimal("10"), False),
        ("Course & Academic", Decimal("10"), False),
        ("Operations & Administration", Decimal("5"), False),
    ]
    made = {}
    for index, (name, percent, floor) in enumerate(spec):
        made[name] = Department.objects.create(
            name=name, percent_of_pool=percent, is_cost_floor=floor, order=index
        )
    return made


@pytest.fixture
def policy(db):
    return SplitPolicy.objects.create(
        effective_from=date(2026, 1, 1), operations_percent=Decimal("55.00")
    )


class TestTheBasicSplit:
    def test_one_sale_splits_three_ways(self, policy, db):
        """₦20,000 paid, ₦400 to Paystack, ₦19,600 net. A founding teacher's
        first course takes 25% — ₦4,900."""
        teacher = make_teacher("ada@t.dev", FOUNDING)
        sale(publish(teacher, "Python"))

        result = compute(MONTH)

        assert result["gross"] == Decimal("20000.00")
        assert result["processor_fees"] == Decimal("400.00")
        assert result["net_revenue"] == Decimal("19600.00")
        assert result["teacher_total"] == Decimal("4900.00")
        assert result["operations_pool"] == Decimal("10780.00")  # 55% of net
        assert result["reserve_amount"] == Decimal("3920.00")  # the remainder

    def test_the_three_parts_add_up_to_net(self, policy, db):
        teacher = make_teacher("ada@t.dev", FOUNDING)
        course = publish(teacher, "Python")
        for day in (3, 11, 19, 27):
            sale(course, day=day)

        result = compute(MONTH)

        assert (
            result["teacher_total"] + result["operations_pool"] + result["reserve_amount"]
            == result["net_revenue"]
        )

    def test_a_standard_teacher_leaves_the_difference_in_the_reserve(self, policy, db):
        """The pool is fixed at 55%. A course on 20% rather than 25% frees up
        5%, and it belongs to the company, not to the departments."""
        founding = make_teacher("found@t.dev", FOUNDING)
        standard = make_teacher("std@t.dev", STANDARD)
        sale(publish(founding, "A"))
        sale(publish(standard, "B"), day=12)

        result = compute(MONTH)

        # 2 × ₦19,600 net = ₦39,200. Teachers: 4,900 + 3,920 = 8,820.
        assert result["net_revenue"] == Decimal("39200.00")
        assert result["teacher_total"] == Decimal("8820.00")
        assert result["operations_pool"] == Decimal("21560.00")
        assert result["reserve_amount"] == Decimal("8820.00")

    def test_a_month_with_nothing_in_it_is_all_zeroes(self, policy, db):
        result = compute(MONTH)
        assert result["gross"] == Decimal("0.00")
        assert result["reserve_amount"] == Decimal("0.00")
        assert result["sale_count"] == 0


class TestWhatCountsAsRevenue:
    def test_test_mode_and_simulated_sales_are_ignored(self, policy, db):
        """The guard that stops every test purchase the team ever made from
        becoming real money."""
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        sale(course, day=5, mode="test")
        sale(course, day=6, mode="simulated")

        result = compute(MONTH)

        assert result["sale_count"] == 0
        assert result["gross"] == Decimal("0.00")

    def test_a_refunded_sale_is_excluded(self, policy, db):
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        sale(course, day=5)
        sale(course, day=6, refunded=True)

        result = compute(MONTH)

        assert result["sale_count"] == 1
        assert result["gross"] == Decimal("20000.00")

    def test_sales_in_other_months_are_excluded(self, policy, db):
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        payment = sale(course, day=5)
        payment.paid_at = timezone.make_aware(timezone.datetime(2026, 12, 2, 12, 0))
        payment.save(update_fields=["paid_at"])

        assert compute(MONTH)["sale_count"] == 0

    def test_the_month_boundary_is_midnight_in_lagos(self, policy, db):
        """MooreSkillUp runs on Africa/Lagos, an hour ahead of UTC. Comparing
        against a bare date puts a sale made just after midnight into the month
        before — a teacher paid in the wrong month, invisible until checked."""
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")

        just_inside = sale(course, day=1)
        just_inside.paid_at = timezone.make_aware(
            timezone.datetime(2026, 11, 1, 0, 30)
        )
        just_inside.save(update_fields=["paid_at"])

        just_outside = sale(course, day=2)
        just_outside.paid_at = timezone.make_aware(
            timezone.datetime(2026, 10, 31, 23, 30)
        )
        just_outside.save(update_fields=["paid_at"])

        result = compute(MONTH)

        assert result["sale_count"] == 1
        assert result["gross"] == Decimal("20000.00")

    def test_a_sale_without_a_recorded_fee_is_counted_and_flagged(self, policy, db):
        """Sales fulfilled before the fee was recorded cannot be corrected, so
        the count goes where somebody reading the figures will see it."""
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"), fee=None)

        result = compute(MONTH)

        assert result["sales_missing_fee"] == 1
        assert result["processor_fees"] == Decimal("0.00")
        assert result["net_revenue"] == Decimal("20000.00")


class TestWhatATeacherEarns:
    def test_a_sale_outside_the_twelve_months_earns_nothing(self, policy, db):
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Old", when=at(1, 0) - timedelta(days=400))
        sale(course)

        result = compute(MONTH)

        assert result["teacher_total"] == Decimal("0.00")
        assert result["gross"] == Decimal("20000.00")
        assert [reason for _, reason in unearned_reasons(MONTH)] == [
            "Sold outside the course's 12-month period"
        ]

    def test_a_stopped_agreement_earns_nothing_from_that_day(self, policy, db):
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Stopped")
        term = course.earning_term
        term.stopped_at = at(8)
        term.stopped_reason = "Ended for cause"
        term.save()
        sale(course, day=5)
        sale(course, day=15)

        result = compute(MONTH)

        assert result["teacher_total"] == Decimal("4900.00")
        assert [reason for _, reason in unearned_reasons(MONTH)] == [
            "The agreement was ended before this sale"
        ]

    def test_the_teacher_share_is_net_of_that_sale_s_own_fee(self, policy, db):
        """Never a share of money the business did not receive."""
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"), amount="20000", fee="2000")

        result = compute(MONTH)

        assert result["teacher_total"] == Decimal("4500.00")  # 25% of 18,000

    def test_the_breakdown_shows_the_sales_behind_the_figure(self, policy, db):
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        sale(course, day=4)
        sale(course, day=14)

        rows = teacher_breakdown(MONTH)

        assert len(rows) == 1
        assert rows[0]["total"] == Decimal("9800.00")
        assert len(rows[0]["sales"]) == 2
        assert rows[0]["sales"][0]["share_percent"] == Decimal("25.00")


class TestDepartments:
    def test_the_pool_divides_by_percentage(self, policy, db):
        made = departments()
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        for day in range(1, 31):
            sale(course, day=day)

        result = compute(MONTH)
        rows = {row["department"].name: row for row in result["allocations"]}

        pool = result["operations_pool"]
        assert rows["Technology & Product"]["calculated"] == (pool * Decimal("22") / 100).quantize(
            Decimal("0.01")
        )
        assert rows["Operations & Administration"]["percent_used"] == Decimal("5.00")
        assert len(rows) == len(made)

    def test_a_cap_holds_money_back_and_returns_it_to_the_reserve(self, policy, db):
        made = departments()
        made["Creative & Design"].monthly_cap = Decimal("1000")
        made["Creative & Design"].save()
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        for day in range(1, 21):
            sale(course, day=day)

        result = compute(MONTH)
        rows = {row["department"].name: row for row in result["allocations"]}
        design = rows["Creative & Design"]

        assert design["actual"] == Decimal("1000.00")
        assert design["excess_returned"] > 0
        assert design["calculated"] == design["actual"] + design["excess_returned"]

    def test_the_cost_floor_takes_its_bill_and_draws_from_the_reserve(self, policy, db):
        """Infrastructure's allocation is an invoice that arrives whether or
        not the percentage covers it."""
        made = departments()
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"))
        CostEntry.objects.create(
            month=MONTH,
            department=made["Infrastructure & Software"],
            category="hosting",
            amount=Decimal("150000"),
        )

        result = compute(MONTH)
        infra = next(
            row for row in result["allocations"] if row["department"].name.startswith("Infra")
        )

        assert infra["cost_total"] == Decimal("150000.00")
        assert infra["actual"] == Decimal("150000.00")
        assert infra["reserve_draw"] == Decimal("150000.00") - infra["calculated"]
        # The reserve paid for it, and says so by going negative on a tiny month.
        assert result["reserve_amount"] < 0

    def test_a_cost_floor_below_its_share_keeps_its_share(self, policy, db):
        made = departments()
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        for day in range(1, 31):
            sale(course, day=day)
        CostEntry.objects.create(
            month=MONTH,
            department=made["Infrastructure & Software"],
            category="hosting",
            amount=Decimal("100"),
        )

        result = compute(MONTH)
        infra = next(
            row for row in result["allocations"] if row["department"].name.startswith("Infra")
        )

        assert infra["actual"] == infra["calculated"]
        assert infra["reserve_draw"] == Decimal("0.00")

    def test_a_sub_department_s_costs_belong_to_its_parent(self, policy, db):
        """The Promotion Squad is paid out of Marketing's allocation, so its
        airtime is Marketing's bill."""
        made = departments()
        squad = Department.objects.create(
            name="Promotion Squad", parent=made["Marketing & Social"]
        )
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"))
        CostEntry.objects.create(
            month=MONTH, department=squad, category="data", amount=Decimal("5000")
        )

        result = compute(MONTH)
        rows = {row["department"].name: row for row in result["allocations"]}

        assert rows["Marketing & Social"]["cost_total"] == Decimal("5000.00")
        assert "Promotion Squad" not in rows

    def test_an_inactive_department_gets_nothing(self, policy, db):
        made = departments()
        made["Content"].is_active = False
        made["Content"].save()
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"))

        names = {row["department"].name for row in compute(MONTH)["allocations"]}

        assert "Content" not in names


class TestClosingAMonth:
    def test_saving_writes_the_period_and_its_departments(self, policy, db):
        departments()
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"))

        period, saved = save_period(MONTH)

        assert saved is True
        assert period.net_revenue == Decimal("19600.00")
        assert period.allocations.count() == 8
        assert period.status == RevenuePeriod.OPEN

    def test_an_open_month_is_recomputed_each_time(self, policy, db):
        departments()
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        sale(course, day=3)
        save_period(MONTH)

        sale(course, day=14)
        period, _ = save_period(MONTH)

        assert period.sale_count == 2
        assert period.gross == Decimal("40000.00")
        assert period.allocations.count() == 8

    def test_a_closed_month_never_changes_again(self, policy, db):
        """The refusal is the whole point of closing it."""
        departments()
        teacher = make_teacher("ada@t.dev")
        course = publish(teacher, "Python")
        sale(course, day=3)
        period, _ = save_period(MONTH, close=True)
        assert period.is_closed

        sale(course, day=20)
        period_again, saved = save_period(MONTH)

        assert saved is False
        assert period_again.sale_count == 1
        assert period_again.gross == Decimal("20000.00")

    def test_closing_records_who_and_when(self, policy, db):
        departments()
        user = User.objects.create_user(
            email="boss@t.dev", username="boss", display_name="Boss", password="x",
            role="admin", admin_role="super_admin",
        )
        period, _ = save_period(MONTH, close=True, user=user)

        assert period.closed_by == user
        assert period.closed_at is not None

    def test_the_policy_used_is_recorded_on_the_month(self, policy, db):
        departments()
        period, _ = save_period(MONTH)

        assert period.policy == policy
        assert period.operations_percent_used == Decimal("55.00")

    def test_a_later_policy_does_not_reach_backwards(self, policy, db):
        """A month closed in December keeps December's rules."""
        SplitPolicy.objects.create(
            effective_from=date(2027, 1, 1), operations_percent=Decimal("40.00")
        )
        departments()
        teacher = make_teacher("ada@t.dev")
        sale(publish(teacher, "Python"))

        result = compute(MONTH)

        assert result["operations_percent_used"] == Decimal("55.00")
