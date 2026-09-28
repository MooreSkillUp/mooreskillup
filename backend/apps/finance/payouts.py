"""Turning sales into earning lines, and earning lines into payouts.

    a live, unrefunded sale of a course inside its earning period
      → an earning line, frozen, pending until its refund window closes
      → payable, in the month the window closed
      → gathered into one payout per teacher per month
      → approved, transferred at the bank, marked paid with the reference

Refunds are the awkward case and are handled in two places. A refund before the
line was paid reverses the line. A refund after it was paid becomes a clawback
on the next payout — never an edit to a statement already sent.
"""

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.payments.models import Payment

from .models import CourseEarningTerm
from .payout_models import EarningLine, Payout, PayoutAdjustment
from .revenue_models import money

ZERO = Decimal("0.00")

# Matches the published Refund Policy and the Teacher Agreement. Read from
# settings so the three can never drift apart silently.
DEFAULT_REFUND_WINDOW_DAYS = 14
# Below this, a payout is carried into the next month rather than sent, and the
# Teacher Agreement says it is never held more than twice.
#
# Set low on purpose. A ₦20,000 sale at 25% earns ₦4,900, so a ₦5,000 floor
# would have held a founding teacher's first lone sale for being ₦100 short —
# a bad first experience for someone who took a risk on us, and worth far more
# than the bank charge it saves.
MINIMUM_PAYOUT = Decimal("2000.00")
MAX_CARRIES = 2


def refund_window_days():
    from django.conf import settings

    return int(getattr(settings, "REFUND_WINDOW_DAYS", DEFAULT_REFUND_WINDOW_DAYS))


def qualifying_moment(payment):
    """When a sale stops being refundable and starts being owed."""
    paid = payment.paid_at or payment.created_at
    return paid + timedelta(days=refund_window_days())


@transaction.atomic
def record_earnings(up_to=None):
    """Create the earning lines for sales that do not have one yet.

    Idempotent: a payment has at most one line, enforced by the database, so
    running this twice creates nothing new. That matters the first time
    somebody presses the button twice.
    """
    up_to = up_to or timezone.now()
    candidates = (
        Payment.objects.filter(
            status="successful",
            mode="live",
            refunded_at__isnull=True,
            paid_at__isnull=False,
            paid_at__lte=up_to,
            earning_line__isnull=True,
        )
        .select_related("course")
        .order_by("paid_at")
    )

    terms = {
        term.course_id: term
        for term in CourseEarningTerm.objects.filter(
            course_id__in={p.course_id for p in candidates}
        )
    }

    created = []
    for payment in candidates:
        term = terms.get(payment.course_id)
        # No recorded terms, sold outside the 12 months, or after the agreement
        # was stopped. The money is still the company's; there is simply no
        # teacher share, and a line of zero would only invite questions.
        if term is None or term.teacher_id is None or not term.earns_on(payment.paid_at):
            continue
        line = EarningLine.build(payment, term, qualifying_moment(payment))
        if line.amount <= 0:
            continue
        created.append(line)

    EarningLine.objects.bulk_create(created)
    return created


@transaction.atomic
def settle_windows(now=None):
    """Move lines past their refund window from pending to payable.

    A line whose sale was refunded in the meantime is reversed instead. This is
    the moment the decision is made, once, rather than being re-derived every
    time a payout is generated.
    """
    now = now or timezone.now()
    ripe = EarningLine.objects.filter(
        status=EarningLine.PENDING, qualifies_at__lte=now
    ).select_related("payment")

    reversed_count = 0
    payable_count = 0
    for line in ripe:
        if line.payment.refunded_at is not None or line.payment.status == "refunded":
            line.status = EarningLine.REVERSED
            reversed_count += 1
        else:
            line.status = EarningLine.PAYABLE
            payable_count += 1
        line.save(update_fields=["status", "updated_at"])
    return {"payable": payable_count, "reversed": reversed_count}


@transaction.atomic
def reverse_refunded(now=None):
    """Handle a refund that arrived after the money was already paid out.

    The line is marked reversed and the same amount is put on the teacher's
    next payout as a clawback, so a statement that has been sent stays true and
    the correction is visible rather than silent.
    """
    now = now or timezone.now()
    affected = EarningLine.objects.filter(
        status=EarningLine.PAID, payment__refunded_at__isnull=False
    ).select_related("payment", "teacher")

    clawbacks = []
    for line in affected:
        payout = open_payout_for(line.teacher, now.strftime("%Y-%m"))
        PayoutAdjustment.objects.create(
            payout=payout,
            kind=PayoutAdjustment.CLAWBACK,
            amount=-line.amount,
            reason=f"Refund of {line.payment.course.title}, paid in {line.period}",
            related_payment=line.payment,
        )
        line.status = EarningLine.REVERSED
        line.save(update_fields=["status", "updated_at"])
        clawbacks.append(payout)
        recalculate(payout)
    return clawbacks


def next_period(period):
    year, month = (int(part) for part in period.split("-"))
    return f"{year + 1}-01" if month == 12 else f"{year}-{month + 1:02d}"


def open_payout_for(teacher, period):
    """The soonest payout this teacher has that can still take an adjustment.

    A clawback must land somewhere. If this month has already been approved or
    paid, it moves to the next month rather than being dropped — the earlier
    version skipped it, which silently lost the correction and left the line
    looking paid forever.
    """
    for _ in range(24):
        payout, _ = Payout.objects.get_or_create(
            teacher=teacher, period=period, defaults={"status": Payout.DRAFT}
        )
        if payout.is_editable:
            return payout
        period = next_period(period)
    raise RuntimeError("Could not find a payout period to adjust.")


def recalculate(payout):
    """Re-add a draft payout from its lines and adjustments."""
    lines_total = sum(
        (line.amount for line in payout.lines.filter(status=EarningLine.PAYABLE)), ZERO
    )
    adjustments = sum((a.amount for a in payout.adjustments.all()), ZERO)
    payout.lines_total = money(lines_total)
    payout.adjustments_total = money(adjustments)
    payout.amount = money(lines_total + adjustments)
    payout.save(update_fields=["lines_total", "adjustments_total", "amount", "updated_at"])
    return payout


@transaction.atomic
def generate(period, *, minimum=MINIMUM_PAYOUT):
    """Build the draft payouts for a month.

    Running this twice changes nothing, because a payout is unique per teacher
    per period and an already-approved one is left alone.
    """
    settle_windows()

    lines = EarningLine.objects.filter(
        period=period, status=EarningLine.PAYABLE
    ).select_related("teacher")

    by_teacher = {}
    for line in lines:
        by_teacher.setdefault(line.teacher_id, []).append(line)

    built = []
    for teacher_id, teacher_lines in by_teacher.items():
        payout, _ = Payout.objects.get_or_create(
            teacher_id=teacher_id, period=period, defaults={"status": Payout.DRAFT}
        )
        if not payout.is_editable:
            continue
        EarningLine.objects.filter(id__in=[line.id for line in teacher_lines]).update(
            payout=payout
        )
        payout.refresh_from_db()
        carry_in(payout)
        recalculate(payout)

        if payout.amount > 0 and payout.amount < minimum and carries_so_far(payout) < MAX_CARRIES:
            payout.status = Payout.CARRIED
            payout.note = f"Under the {minimum:,.0f} minimum — carried to next month"
            payout.save(update_fields=["status", "note", "updated_at"])
        built.append(payout)
    return built


def carries_so_far(payout):
    """How many months this teacher's money has already been held."""
    return Payout.objects.filter(teacher=payout.teacher, status=Payout.CARRIED).count()


def carry_in(payout):
    """Bring forward anything held back from earlier months."""
    held = Payout.objects.filter(
        teacher=payout.teacher, status=Payout.CARRIED
    ).exclude(period=payout.period)
    for earlier in held:
        if earlier.amount <= 0:
            continue
        already = payout.adjustments.filter(
            kind=PayoutAdjustment.CARRIED_IN, reason__contains=earlier.period
        ).exists()
        if already:
            continue
        PayoutAdjustment.objects.create(
            payout=payout,
            kind=PayoutAdjustment.CARRIED_IN,
            amount=earlier.amount,
            reason=f"Carried forward from {earlier.period}",
        )
        earlier.status = Payout.PAID
        earlier.note = f"Rolled into {payout.period}"
        earlier.amount = ZERO
        earlier.save(update_fields=["status", "note", "amount", "updated_at"])


@transaction.atomic
def approve(payout, user):
    """Confirm the figure before any money moves."""
    if payout.status != Payout.DRAFT:
        return payout, "Only a draft payout can be approved."
    if payout.amount <= 0:
        return payout, "There is nothing to approve."
    detail = getattr(payout.teacher, "payout_detail", None)
    if detail is None or not detail.is_complete:
        return payout, "This teacher has no bank details on file."
    if detail.verified_at is None:
        # The details changed since anyone last looked at them, or were never
        # checked. This is the guard against the only attack that matters here.
        return payout, "The bank details have not been verified since they last changed."
    payout.status = Payout.APPROVED
    payout.approved_by = user if getattr(user, "is_authenticated", False) else None
    payout.approved_at = timezone.now()
    payout.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
    return payout, None


@transaction.atomic
def mark_paid(payout, user, reference):
    """Record the transfer that was made at the bank."""
    if payout.status != Payout.APPROVED:
        return payout, "Approve the payout before marking it paid."
    if not reference.strip():
        return payout, "Enter the bank transfer reference."
    payout.status = Payout.PAID
    payout.paid_by = user if getattr(user, "is_authenticated", False) else None
    payout.paid_at = timezone.now()
    payout.reference = reference.strip()
    payout.save(
        update_fields=["status", "paid_by", "paid_at", "reference", "updated_at"]
    )
    payout.lines.filter(status=EarningLine.PAYABLE).update(status=EarningLine.PAID)
    return payout, None


def owed_summary(teacher):
    """What one teacher has coming, for their own earnings page."""
    lines = EarningLine.objects.filter(teacher=teacher)
    return {
        "pending": money(
            sum((line.amount for line in lines.filter(status=EarningLine.PENDING)), ZERO)
        ),
        "payable": money(
            sum((line.amount for line in lines.filter(status=EarningLine.PAYABLE)), ZERO)
        ),
        "paid": money(sum((line.amount for line in lines.filter(status=EarningLine.PAID)), ZERO)),
    }
