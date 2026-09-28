"""Paying teachers: from a sale to a bank transfer reference.

    a live, unrefunded sale of a course inside its earning period
      → an earning line, frozen, pending until its refund window closes
      → payable, in the month the window closed
      → one payout per teacher per month
      → approved, transferred at the bank, marked paid with the reference

The cases that matter are the awkward ones. A sale refunded inside its window
earns nothing. A refund arriving after the money went out becomes a clawback on
the next payout rather than an edit to a statement already sent. And a payout
cannot be approved to bank details nobody has verified since they last changed
— which is the only attack on a payouts system worth designing against.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.finance.models import FOUNDING, STANDARD, TeacherTerms
from apps.finance.payout_models import EarningLine, Payout, PayoutAdjustment, TeacherPayoutDetail
from apps.finance.payouts import (
    MINIMUM_PAYOUT,
    approve,
    generate,
    mark_paid,
    owed_summary,
    record_earnings,
    reverse_refunded,
    settle_windows,
)
from apps.payments.models import Payment


def a_user(role, email, **extra):
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=email.split("@")[0].title(),
        password="x",
        role=role,
        **extra,
    )


def a_teacher(email="ada@pay.dev", agreement=FOUNDING):
    teacher = TeacherProfile.objects.create(
        user=a_user("teacher", email), program="Tech", track="Python"
    )
    TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(agreement))
    return teacher


def with_bank(teacher, verified=True):
    detail = TeacherPayoutDetail.objects.create(
        teacher=teacher,
        account_name="Ada Obi",
        bank_name="GTBank",
        account_number="0123456789",
        verified_at=timezone.now() if verified else None,
    )
    return detail


def a_course(teacher, title="Python", published=None):
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
    course.published_at = published or (timezone.now() - timedelta(days=60))
    course.save()
    return course


def a_sale(course, amount="20000", fee="400", days_ago=30, mode="live"):
    student = StudentProfile.objects.create(
        user=a_user("student", f"s{Payment.objects.count()}@pay.dev")
    )
    return Payment.objects.create(
        student=student,
        course=course,
        amount=Decimal(amount),
        processor_fee=Decimal(fee),
        currency="NGN",
        payment_method="paystack",
        status="successful",
        mode=mode,
        description="x",
        paid_at=timezone.now() - timedelta(days=days_ago),
    )


def refund(payment):
    payment.status = "refunded"
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at"])
    return payment


class TestRecordingEarnings:
    def test_a_sale_becomes_a_frozen_line(self, db):
        teacher = a_teacher()
        a_sale(a_course(teacher))

        record_earnings()

        line = EarningLine.objects.get()
        assert line.gross == Decimal("20000.00")
        assert line.processor_fee == Decimal("400.00")
        assert line.net == Decimal("19600.00")
        assert line.share_percent == Decimal("25.00")
        assert line.amount == Decimal("4900.00")
        assert line.status == EarningLine.PENDING

    def test_running_it_twice_creates_nothing_new(self, db):
        """The first time somebody presses the button twice."""
        teacher = a_teacher()
        a_sale(a_course(teacher))

        record_earnings()
        record_earnings()

        assert EarningLine.objects.count() == 1

    def test_changing_the_agreement_does_not_move_a_recorded_line(self, db):
        teacher = a_teacher()
        a_sale(a_course(teacher))
        record_earnings()

        terms = teacher.terms
        terms.premium_share_percent = Decimal("5.00")
        terms.save()

        line = EarningLine.objects.get()
        assert line.share_percent == Decimal("25.00")
        assert line.amount == Decimal("4900.00")

    def test_test_and_simulated_sales_never_earn(self, db):
        teacher = a_teacher()
        course = a_course(teacher)
        a_sale(course, mode="test")
        a_sale(course, mode="simulated")

        record_earnings()

        assert EarningLine.objects.count() == 0

    def test_an_already_refunded_sale_never_earns(self, db):
        teacher = a_teacher()
        refund(a_sale(a_course(teacher)))

        record_earnings()

        assert EarningLine.objects.count() == 0

    def test_a_sale_outside_the_earning_period_earns_nothing(self, db):
        teacher = a_teacher()
        course = a_course(teacher, published=timezone.now() - timedelta(days=500))
        a_sale(course, days_ago=10)

        record_earnings()

        assert EarningLine.objects.count() == 0

    def test_a_standard_teacher_earns_their_own_rate(self, db):
        teacher = a_teacher("std@pay.dev", STANDARD)
        a_sale(a_course(teacher))

        record_earnings()

        assert EarningLine.objects.get().amount == Decimal("3920.00")  # 20% of 19,600


class TestTheRefundWindow:
    def test_a_line_is_pending_until_its_window_closes(self, db):
        teacher = a_teacher()
        a_sale(a_course(teacher), days_ago=3)
        record_earnings()

        settle_windows()

        assert EarningLine.objects.get().status == EarningLine.PENDING

    def test_a_line_becomes_payable_once_the_window_passes(self, db):
        teacher = a_teacher()
        a_sale(a_course(teacher), days_ago=20)
        record_earnings()

        result = settle_windows()

        assert result["payable"] == 1
        assert EarningLine.objects.get().status == EarningLine.PAYABLE

    def test_a_refund_inside_the_window_reverses_the_line(self, db):
        """Never pay out on money that might be given back."""
        teacher = a_teacher()
        payment = a_sale(a_course(teacher), days_ago=20)
        record_earnings()
        refund(payment)

        result = settle_windows()

        assert result["reversed"] == 1
        assert EarningLine.objects.get().status == EarningLine.REVERSED

    def test_the_period_is_the_month_the_window_closed(self, db):
        """Not the month it was sold. A sale on the 28th is paid the month
        after, which is what the agreement says."""
        teacher = a_teacher()
        a_sale(a_course(teacher), days_ago=30)
        record_earnings()

        line = EarningLine.objects.get()
        expected = (line.payment.paid_at + timedelta(days=14)).strftime("%Y-%m")
        assert line.period == expected


class TestGeneratingPayouts:
    def test_one_payout_per_teacher_gathers_their_lines(self, db):
        teacher = a_teacher()
        course = a_course(teacher)
        for _ in range(3):
            a_sale(course, days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period

        payouts = generate(period)

        assert len(payouts) == 1
        payout = payouts[0]
        assert payout.lines.count() == 3
        assert payout.amount == Decimal("14700.00")  # 3 × 4,900

    def test_generating_twice_changes_nothing(self, db):
        teacher = a_teacher()
        a_sale(a_course(teacher), days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period

        generate(period)
        generate(period)

        assert Payout.objects.count() == 1
        assert Payout.objects.get().amount == Decimal("4900.00")

    def test_two_teachers_get_their_own_payouts(self, db):
        one = a_teacher("one@pay.dev")
        two = a_teacher("two@pay.dev")
        a_sale(a_course(one, "A"), days_ago=30)
        a_sale(a_course(two, "B"), days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period

        payouts = generate(period)

        assert len(payouts) == 2
        assert {p.teacher_id for p in payouts} == {one.id, two.id}

    def test_a_small_payout_is_carried_to_next_month(self, db):
        """Bank charges and the effort of a transfer make a tiny payment worse
        than waiting."""
        teacher = a_teacher()
        a_sale(a_course(teacher), amount="2000", fee="100", days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period

        payouts = generate(period)

        assert payouts[0].amount < MINIMUM_PAYOUT
        assert payouts[0].status == Payout.CARRIED

    def test_a_teacher_s_first_lone_sale_is_paid_not_held(self, db):
        """The reason the minimum is ₦2,000 rather than ₦5,000: a ₦20,000 sale
        at 25% earns ₦4,900, and holding that for being ₦100 short would be a
        poor first experience for someone who took a risk on us."""
        teacher = a_teacher()
        a_sale(a_course(teacher), days_ago=30)
        record_earnings()

        payouts = generate(EarningLine.objects.first().period)

        assert payouts[0].amount == Decimal("4900.00")
        assert payouts[0].status == Payout.DRAFT

    def test_carried_money_appears_on_the_next_payout(self, db):
        teacher = a_teacher()
        course = a_course(teacher)
        a_sale(course, amount="2000", fee="100", days_ago=45)
        record_earnings()
        first_period = EarningLine.objects.first().period
        generate(first_period)
        carried = Payout.objects.get(period=first_period)
        assert carried.status == Payout.CARRIED
        held = carried.amount

        a_sale(course, days_ago=30)
        record_earnings()
        second_period = (
            EarningLine.objects.exclude(period=first_period).first().period
        )
        generate(second_period)

        later = Payout.objects.get(period=second_period)
        assert later.adjustments.filter(kind=PayoutAdjustment.CARRIED_IN).exists()
        assert later.amount == Decimal("4900.00") + held


class TestApprovingAndPaying:
    def _ready(self, verified=True, sales=2):
        """Two sales, so the payout is a normal one rather than an edge case."""
        teacher = a_teacher()
        with_bank(teacher, verified=verified)
        course = a_course(teacher)
        for _ in range(sales):
            a_sale(course, days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period
        generate(period)
        return teacher, Payout.objects.get()

    def test_the_happy_path(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready()

        payout, error = approve(payout, boss)
        assert error is None
        assert payout.status == Payout.APPROVED

        payout, error = mark_paid(payout, boss, "TRF-99812")
        assert error is None
        assert payout.status == Payout.PAID
        assert payout.reference == "TRF-99812"
        assert payout.lines.filter(status=EarningLine.PAID).count() == 2

    def test_it_cannot_be_approved_without_bank_details(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        teacher = a_teacher()
        course = a_course(teacher)
        for _ in range(2):
            a_sale(course, days_ago=30)
        record_earnings()
        generate(EarningLine.objects.first().period)

        _, error = approve(Payout.objects.get(), boss)

        assert error == "This teacher has no bank details on file."

    def test_it_cannot_be_approved_to_unverified_details(self, db):
        """The guard against the only attack that matters: changing where money
        goes, days before a run."""
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready(verified=False)

        _, error = approve(payout, boss)

        assert "not been verified" in error

    def test_paying_before_approving_is_refused(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready()

        _, error = mark_paid(payout, boss, "TRF-1")

        assert error == "Approve the payout before marking it paid."

    def test_a_reference_is_required(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready()
        payout, _ = approve(payout, boss)

        _, error = mark_paid(payout, boss, "   ")

        assert error == "Enter the bank transfer reference."

    def test_approving_twice_is_refused(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready()
        payout, _ = approve(payout, boss)

        _, error = approve(payout, boss)

        assert error == "Only a draft payout can be approved."

    def test_who_approved_and_who_paid_is_recorded(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        _, payout = self._ready()
        payout, _ = approve(payout, boss)
        payout, _ = mark_paid(payout, boss, "TRF-7")

        assert payout.approved_by == boss
        assert payout.paid_by == boss
        assert payout.approved_at is not None
        assert payout.paid_at is not None


class TestARefundAfterPayment:
    def test_it_becomes_a_clawback_on_the_next_payout(self, db):
        """A statement already sent stays true; the correction is visible."""
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        teacher = a_teacher()
        with_bank(teacher)
        course = a_course(teacher)
        payment = a_sale(course, days_ago=30)
        a_sale(course, days_ago=30)
        record_earnings()
        generate(EarningLine.objects.first().period)
        payout, _ = approve(Payout.objects.get(), boss)
        mark_paid(payout, boss, "TRF-1")

        refund(payment)
        reverse_refunded()

        reversed_line = EarningLine.objects.get(payment=payment)
        assert reversed_line.status == EarningLine.REVERSED
        assert EarningLine.objects.filter(status=EarningLine.PAID).count() == 1
        clawback = PayoutAdjustment.objects.get(kind=PayoutAdjustment.CLAWBACK)
        assert clawback.amount == Decimal("-4900.00")
        assert clawback.related_payment_id == payment.id

    def test_the_paid_statement_is_not_edited(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        teacher = a_teacher()
        with_bank(teacher)
        course = a_course(teacher)
        payment = a_sale(course, days_ago=30)
        a_sale(course, days_ago=30)
        record_earnings()
        generate(EarningLine.objects.first().period)
        payout, _ = approve(Payout.objects.get(), boss)
        payout, _ = mark_paid(payout, boss, "TRF-1")
        original = payout.amount

        refund(payment)
        reverse_refunded()
        payout.refresh_from_db()

        assert payout.amount == original
        assert payout.status == Payout.PAID


    def test_a_clawback_moves_on_when_this_month_is_already_paid(self, db):
        """It has to land somewhere. An earlier version skipped it when the
        current month was already out, which silently lost the correction and
        left the reversed line looking paid forever."""
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        teacher = a_teacher()
        with_bank(teacher)
        course = a_course(teacher)
        payment = a_sale(course, days_ago=30)
        a_sale(course, days_ago=30)
        record_earnings()
        period = EarningLine.objects.first().period
        generate(period)
        payout, _ = approve(Payout.objects.get(), boss)
        mark_paid(payout, boss, "TRF-1")

        # Force the clawback to be attempted against the month already paid.
        from apps.finance.payouts import reverse_refunded as run

        refund(payment)
        run(now=payment.paid_at + timedelta(days=14))

        clawback = PayoutAdjustment.objects.get(kind=PayoutAdjustment.CLAWBACK)
        assert clawback.payout.id != payout.id
        assert clawback.payout.is_editable
        assert EarningLine.objects.get(payment=payment).status == EarningLine.REVERSED


class TestWhatATeacherSees:
    def test_the_summary_separates_pending_payable_and_paid(self, db):
        boss = a_user("admin", "boss@pay.dev", admin_role="super_admin")
        teacher = a_teacher()
        with_bank(teacher)
        course = a_course(teacher)
        a_sale(course, days_ago=30)
        a_sale(course, days_ago=30)
        a_sale(course, days_ago=2)
        record_earnings()
        settle_windows()

        summary = owed_summary(teacher)
        assert summary["payable"] == Decimal("9800.00")
        assert summary["pending"] == Decimal("4900.00")
        assert summary["paid"] == Decimal("0.00")

        generate(EarningLine.objects.filter(status=EarningLine.PAYABLE).first().period)
        payout, _ = approve(Payout.objects.get(), boss)
        mark_paid(payout, boss, "TRF-2")

        summary = owed_summary(teacher)
        assert summary["paid"] == Decimal("9800.00")
        assert summary["payable"] == Decimal("0.00")
