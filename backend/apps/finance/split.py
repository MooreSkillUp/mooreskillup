"""Working out one month.

    sales in the month, live and not refunded
      → gross, less the processor's fees            = net revenue
      → each course's own agreed share to its teacher
      → a fixed share of net to the operations pool
      → whatever is left to the company reserve

    the pool → each department by its percentage
             → a cost floor takes the higher of its share or its actual bill,
               drawing the difference from the reserve
             → a cap holds the rest back, and the excess returns to the reserve

Rounding happens per figure, never on a total, so the department rows add up to
the pool and the teacher rows add up to what is paid.
"""

from datetime import date, datetime, time
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.organization.models import Department
from apps.payments.models import Payment

from .models import CourseEarningTerm
from .revenue_models import (
    CostEntry,
    DepartmentAllocation,
    RevenuePeriod,
    SplitPolicy,
    money,
)

ZERO = Decimal("0.00")


def month_start(when):
    return date(when.year, when.month, 1)


def next_month_start(first):
    return date(first.year + 1, 1, 1) if first.month == 12 else date(first.year, first.month + 1, 1)


def month_bounds(first_of_month):
    """Midnight to midnight, in Lagos.

    Comparing a stored timestamp against a bare date makes Django read that
    date as naive and warn about it, and the boundary then lands an hour out:
    a sale at 00:30 on the first of the month would be counted in the month
    before. That is a teacher paid in the wrong month, and it is invisible
    until somebody checks.
    """
    start = timezone.make_aware(datetime.combine(first_of_month, time.min))
    end = timezone.make_aware(datetime.combine(next_month_start(first_of_month), time.min))
    return start, end


def sales_in(first_of_month):
    """Every payment that counts as revenue for a month.

    `mode="live"` is the guard that matters: Paystack test keys and simulated
    checkouts both report success without anyone being charged, and every test
    purchase the team ever made would otherwise become real money and a real
    payout.

    A refunded sale is excluded from an open month. Once a month is closed it
    keeps what it had, and a refund arriving afterwards becomes an adjustment
    on the next payout rather than a quiet rewrite of a figure somebody has
    already been shown.
    """
    start, end = month_bounds(first_of_month)
    return (
        Payment.objects.filter(
            status="successful",
            mode="live",
            refunded_at__isnull=True,
            paid_at__gte=start,
            paid_at__lt=end,
        )
        .select_related("course")
        .order_by("paid_at")
    )


def teacher_share_for(payment, terms_by_course):
    """What one sale owes its teacher, at that course's own agreed rate.

    Net of the processor's fee on that same sale, so the teacher is never paid
    a share of money the business did not receive.
    """
    term = terms_by_course.get(payment.course_id)
    if term is None or not term.earns_on(payment.paid_at):
        return ZERO, None
    net = Decimal(payment.amount) - Decimal(payment.processor_fee or 0)
    if net <= 0:
        return ZERO, term
    return money(net * term.share_percent / 100), term


def compute(first_of_month):
    """Work out a month without saving anything.

    Returns a plain dictionary so the figures can be shown on an open month,
    and recomputed as often as anyone likes, before a decision is made to
    freeze them.
    """
    policy = SplitPolicy.for_month(first_of_month)
    payments = list(sales_in(first_of_month))

    course_ids = {p.course_id for p in payments}
    terms_by_course = {
        term.course_id: term
        for term in CourseEarningTerm.objects.filter(course_id__in=course_ids)
    }

    gross = ZERO
    fees = ZERO
    missing_fee = 0
    teacher_total = ZERO
    per_teacher = {}

    for payment in payments:
        gross += Decimal(payment.amount)
        if payment.processor_fee is None:
            missing_fee += 1
        else:
            fees += Decimal(payment.processor_fee)
        share, term = teacher_share_for(payment, terms_by_course)
        if share > 0 and term is not None:
            teacher_total += share
            key = term.teacher_id
            per_teacher[key] = per_teacher.get(key, ZERO) + share

    gross = money(gross)
    fees = money(fees)
    net = money(gross - fees)

    pool = money(net * policy.operations_percent / 100)
    # The reserve is what is left, not a percentage of its own. A course on 20%
    # instead of 25% leaves a difference, and that difference belongs to the
    # company rather than inflating the departments.
    reserve = money(net - teacher_total - pool)

    allocations, reserve = allocate(first_of_month, pool, reserve)

    return {
        "month": first_of_month,
        "policy": policy if policy.pk else None,
        "operations_percent_used": policy.operations_percent,
        "gross": gross,
        "processor_fees": fees,
        "net_revenue": net,
        "teacher_total": money(teacher_total),
        "operations_pool": pool,
        "reserve_amount": reserve,
        "sale_count": len(payments),
        "sales_missing_fee": missing_fee,
        "allocations": allocations,
        "per_teacher": per_teacher,
    }


def allocate(first_of_month, pool, reserve):
    """Split the pool across departments, and adjust the reserve as it goes."""
    costs = costs_by_department(first_of_month)
    departments = Department.objects.filter(is_active=True, parent__isnull=True).order_by(
        "order", "name"
    )

    rows = []
    for department in departments:
        percent = Decimal(department.percent_of_pool)
        calculated = money(pool * percent / 100)
        cost_total = costs.get(department.id, ZERO)
        cap = department.monthly_cap
        draw = ZERO
        excess = ZERO

        if department.is_cost_floor:
            # Its allocation is an invoice that arrives whether or not the
            # percentage covers it. It takes the higher of the two, and the
            # shortfall comes out of the reserve — which is what a reserve is
            # for, and why the platform cannot go dark because a percentage
            # came out small.
            actual = max(calculated, cost_total)
            draw = money(actual - calculated)
        elif cap is not None and calculated > cap:
            actual = money(cap)
            excess = money(calculated - actual)
        else:
            actual = calculated

        reserve = money(reserve + excess - draw)
        rows.append(
            {
                "department": department,
                "percent_used": percent,
                "calculated": calculated,
                "cap_applied": cap,
                "cost_total": cost_total,
                "actual": actual,
                "reserve_draw": draw,
                "excess_returned": excess,
            }
        )
    return rows, reserve


def costs_by_department(first_of_month):
    """A department's own bills plus its sub-departments'.

    A sub-department is paid out of its parent's allocation, so its costs are
    the parent's costs. Otherwise the Promotion Squad's airtime would sit
    against a department that has no money of its own.
    """
    entries = CostEntry.objects.filter(month=first_of_month).select_related("department")
    totals = {}
    for entry in entries:
        department = entry.department
        owner = department.parent_id or department.id
        totals[owner] = totals.get(owner, ZERO) + Decimal(entry.amount)
    return {key: money(value) for key, value in totals.items()}


@transaction.atomic
def save_period(first_of_month, *, close=False, user=None):
    """Write a month's figures, and optionally freeze them.

    An open month is recomputed and overwritten every time this runs, which is
    what lets the screen show a live picture. A closed month is never touched
    again by this function — the refusal is the whole point of closing it.
    """
    period = RevenuePeriod.objects.select_for_update().filter(month=first_of_month).first()
    if period is not None and period.is_closed:
        return period, False

    result = compute(first_of_month)
    period, _ = RevenuePeriod.objects.update_or_create(
        month=first_of_month,
        defaults={
            "gross": result["gross"],
            "processor_fees": result["processor_fees"],
            "net_revenue": result["net_revenue"],
            "teacher_total": result["teacher_total"],
            "operations_pool": result["operations_pool"],
            "reserve_amount": result["reserve_amount"],
            "sale_count": result["sale_count"],
            "sales_missing_fee": result["sales_missing_fee"],
            "policy": result["policy"],
            "operations_percent_used": result["operations_percent_used"],
        },
    )

    DepartmentAllocation.objects.filter(period=period).delete()
    DepartmentAllocation.objects.bulk_create(
        [
            DepartmentAllocation(
                period=period,
                department=row["department"],
                percent_used=row["percent_used"],
                calculated=row["calculated"],
                cap_applied=row["cap_applied"],
                cost_total=row["cost_total"],
                actual=row["actual"],
                reserve_draw=row["reserve_draw"],
                excess_returned=row["excess_returned"],
            )
            for row in result["allocations"]
        ]
    )

    if close:
        period.status = RevenuePeriod.CLOSED
        period.closed_by = user if getattr(user, "is_authenticated", False) else None
        period.closed_at = timezone.now()
        period.save(update_fields=["status", "closed_by", "closed_at", "updated_at"])

    return period, True


def teacher_breakdown(first_of_month):
    """Each teacher's earnings for the month, and the sales behind them.

    Used by the admin screen so "why is Ada owed ₦4,900?" can be answered by
    pointing at three sales rather than by re-deriving the arithmetic.
    """
    payments = list(sales_in(first_of_month))
    terms_by_course = {
        term.course_id: term
        for term in CourseEarningTerm.objects.filter(
            course_id__in={p.course_id for p in payments}
        ).select_related("teacher__user", "course")
    }

    rows = {}
    for payment in payments:
        share, term = teacher_share_for(payment, terms_by_course)
        if term is None or share <= 0:
            continue
        bucket = rows.setdefault(
            term.teacher_id,
            {
                "teacher": term.teacher,
                "total": ZERO,
                "sales": [],
            },
        )
        bucket["total"] += share
        bucket["sales"].append(
            {
                "payment": payment,
                "course": term.course,
                "share_percent": term.share_percent,
                "amount": share,
            }
        )
    for bucket in rows.values():
        bucket["total"] = money(bucket["total"])
    return list(rows.values())


def unearned_reasons(first_of_month):
    """Sales that earned a teacher nothing, and why.

    Every one of these is a question somebody will ask. Naming the reason on
    the screen is cheaper than answering it three times.
    """
    payments = sales_in(first_of_month)
    terms = {
        t.course_id: t
        for t in CourseEarningTerm.objects.filter(
            course_id__in={p.course_id for p in payments}
        )
    }
    out = []
    for payment in payments:
        term = terms.get(payment.course_id)
        if term is None:
            out.append((payment, "No recorded terms for this course"))
        elif term.stopped_at is not None and payment.paid_at >= term.stopped_at:
            out.append((payment, "The agreement was ended before this sale"))
        elif not term.earns_on(payment.paid_at):
            out.append((payment, "Sold outside the course's 12-month period"))
    return out


def months_with_activity():
    """Months that have either a sale or a cost recorded against them."""
    paid = (
        Payment.objects.filter(status="successful", mode="live", paid_at__isnull=False)
        .annotate(m=models_trunc("paid_at"))
        .values_list("m", flat=True)
        .distinct()
    )
    costed = CostEntry.objects.values_list("month", flat=True).distinct()
    months = {month_start(value) for value in paid if value} | {
        month_start(value) for value in costed if value
    }
    return sorted(months, reverse=True)


def models_trunc(field):
    from django.db.models.functions import TruncMonth

    return TruncMonth(field)


def has_open_activity(first_of_month):
    return sales_in(first_of_month).exists() or CostEntry.objects.filter(
        Q(month=first_of_month)
    ).exists()
