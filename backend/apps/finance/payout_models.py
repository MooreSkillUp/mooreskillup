"""Paying teachers, and recording that it happened.

The platform calculates and records. It does not send money: a payout is
approved here, transferred at the bank, and the reference typed back in.
Automating the transfer needs a funded Paystack balance and a second approver,
and that is worth building at twenty teachers, not three.

Two decisions run through all of it.

**An earning line is frozen when it is created.** The percentage is copied onto
it, not looked up. Prices change, policies change, a teacher may sign different
terms — none of that may move a figure on a statement that has already been
sent, or the statement stops meaning anything.

**A sale only becomes payable once its refund window has closed.** Paying out
on money that might be given back turns every refund into a debt owed by a
teacher, which is a conversation nobody wants to have twice.
"""

from decimal import Decimal

from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

from .revenue_models import money


class EarningLine(UUIDPrimaryKeyModel, TimeStampedModel):
    """One sale's share for one teacher, worked out once and then left alone."""

    PENDING = "pending"
    PAYABLE = "payable"
    PAID = "paid"
    REVERSED = "reversed"
    STATUS_CHOICES = (
        # Sold, but still inside the refund window.
        (PENDING, "Inside the refund window"),
        # The window closed and the sale stood. Owed.
        (PAYABLE, "Payable"),
        (PAID, "Paid"),
        # Refunded or charged back. Earns nothing.
        (REVERSED, "Reversed"),
    )

    payment = models.OneToOneField(
        "payments.Payment", on_delete=models.CASCADE, related_name="earning_line"
    )
    term = models.ForeignKey(
        "finance.CourseEarningTerm", on_delete=models.PROTECT, related_name="lines"
    )
    teacher = models.ForeignKey(
        "accounts.TeacherProfile", on_delete=models.PROTECT, related_name="earning_lines"
    )

    gross = models.DecimalField(max_digits=12, decimal_places=2)
    processor_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    net = models.DecimalField(max_digits=12, decimal_places=2)
    # Copied from the term, never looked up again.
    share_percent = models.DecimalField(max_digits=5, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # When the refund window closes. The month this falls in is the month the
    # sale is paid in — not the month it was sold.
    qualifies_at = models.DateTimeField()
    period = models.CharField(max_length=7)  # YYYY-MM
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=PENDING)

    payout = models.ForeignKey(
        "finance.Payout", null=True, blank=True, on_delete=models.SET_NULL, related_name="lines"
    )

    class Meta:
        ordering = ("-qualifies_at",)
        indexes = [models.Index(fields=("teacher", "period", "status"))]

    def __str__(self):
        return f"{self.teacher.user.display_name}: {self.amount} ({self.period})"

    @classmethod
    def build(cls, payment, term, qualifies_at):
        """The arithmetic, in one place, so a line can never be made two ways."""
        gross = Decimal(payment.amount)
        fee = Decimal(payment.processor_fee or 0)
        net = gross - fee
        return cls(
            payment=payment,
            term=term,
            teacher_id=term.teacher_id,
            gross=money(gross),
            processor_fee=money(fee),
            net=money(net),
            share_percent=term.share_percent,
            amount=money(net * term.share_percent / 100) if net > 0 else Decimal("0.00"),
            qualifies_at=qualifies_at,
            period=qualifies_at.strftime("%Y-%m"),
        )


class TeacherPayoutDetail(UUIDPrimaryKeyModel, TimeStampedModel):
    """Where one teacher is paid.

    The same shape as a team member's, and for the same reason: the attack on a
    payouts system is not stealing money, it is quietly changing where it goes
    days before a run.
    """

    teacher = models.OneToOneField(
        "accounts.TeacherProfile", on_delete=models.CASCADE, related_name="payout_detail"
    )
    account_name = models.CharField(max_length=160, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    account_number = models.CharField(max_length=40, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    def __str__(self):
        return f"{self.teacher.user.display_name}: {self.masked_account_number}"

    @property
    def masked_account_number(self):
        from apps.organization.models import _mask_account

        return _mask_account(self.account_number)

    @property
    def is_complete(self):
        return bool(self.account_name and self.bank_name and self.account_number)


class TeacherPayoutDetailChange(UUIDPrimaryKeyModel, TimeStampedModel):
    """Every edit to where a teacher's money goes, in masked form."""

    teacher = models.ForeignKey(
        "accounts.TeacherProfile", on_delete=models.CASCADE, related_name="payout_detail_changes"
    )
    changed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    field = models.CharField(max_length=40)
    old_value = models.CharField(max_length=160, blank=True)
    new_value = models.CharField(max_length=160, blank=True)

    class Meta:
        ordering = ("-created_at",)


class Payout(UUIDPrimaryKeyModel, TimeStampedModel):
    """What one teacher is owed for one month, and whether it has been sent."""

    DRAFT = "draft"
    APPROVED = "approved"
    PAID = "paid"
    CARRIED = "carried"
    STATUS_CHOICES = (
        (DRAFT, "Draft"),
        (APPROVED, "Approved"),
        (PAID, "Paid"),
        # Under the minimum, rolled into the next month.
        (CARRIED, "Carried forward"),
    )

    teacher = models.ForeignKey(
        "accounts.TeacherProfile", on_delete=models.PROTECT, related_name="payouts"
    )
    period = models.CharField(max_length=7)

    lines_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    adjustments_total = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=DRAFT)
    approved_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    # The bank transfer reference. This is where Paystack Transfers would plug
    # in later without changing anything else.
    reference = models.CharField(max_length=120, blank=True)
    statement_sent_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-period", "teacher__user__display_name")
        constraints = [
            models.UniqueConstraint(fields=("teacher", "period"), name="unique_payout_per_period")
        ]

    def __str__(self):
        return f"{self.teacher.user.display_name} {self.period}: {self.amount}"

    @property
    def is_editable(self):
        return self.status in {self.DRAFT, self.CARRIED}


class PayoutAdjustment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Anything that moves a payout away from the sum of its lines.

    A refund arriving after the teacher was paid for that sale becomes a
    negative line on the next payout rather than an edit to a statement that
    has already been sent.
    """

    CLAWBACK = "refund_clawback"
    CARRIED_IN = "carried_forward"
    CORRECTION = "correction"
    KIND_CHOICES = (
        (CLAWBACK, "Refund after payment"),
        (CARRIED_IN, "Carried forward from a previous month"),
        (CORRECTION, "Correction"),
    )

    payout = models.ForeignKey(
        "finance.Payout", on_delete=models.CASCADE, related_name="adjustments"
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    # Negative for a clawback, positive for money carried in.
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.CharField(max_length=255, blank=True)
    related_payment = models.ForeignKey(
        "payments.Payment", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"{self.get_kind_display()}: {self.amount}"
