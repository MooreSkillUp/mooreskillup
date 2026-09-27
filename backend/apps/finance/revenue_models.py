"""The monthly split: what came in, what it cost, and where the rest went.

Net revenue is divided three ways — the teachers' contracted shares, the
operations pool that funds the departments, and the company reserve. The pool
is then split across departments by percentage and capped.

Two rules shape everything here.

**The reserve absorbs the difference.** The operations pool is a fixed share of
net revenue, and the teachers are paid at whatever each course actually agreed.
When a course is on 20% rather than 25%, that difference does not vanish and it
does not inflate the departments — it falls into the reserve. So the reserve is
computed as what is left, not as a percentage of its own.

**A closed month never changes.** Percentages get edited, caps move, refunds
arrive late. None of it may quietly rewrite a month somebody has already been
shown, so closing a month freezes every figure onto these rows.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

KOBO = Decimal("0.01")


def money(value):
    """Two decimal places, half up. Every figure here passes through this."""
    return Decimal(value).quantize(KOBO, rounding=ROUND_HALF_UP)


class SplitPolicy(UUIDPrimaryKeyModel, TimeStampedModel):
    """How net revenue is divided, from a given date.

    Dated rather than edited in place: a month closed in December keeps the
    rules that were live in December, and changing next month's policy cannot
    reach backwards.
    """

    # What the pool takes. The teachers take whatever their courses agreed, and
    # the reserve takes the remainder — see the module docstring.
    operations_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("55.00"),
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    # Recorded for the record and for the admin screens. The split does not
    # read them, because each course carries its own agreed rate.
    founding_teacher_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("25.00")
    )
    standard_teacher_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("20.00")
    )
    target_reserve_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("20.00")
    )

    effective_from = models.DateField(unique=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ("-effective_from",)
        verbose_name_plural = "split policies"

    def __str__(self):
        return f"From {self.effective_from}: {self.operations_percent}% to operations"

    @classmethod
    def for_month(cls, first_of_month):
        """The policy in force for a month, or a default if none was ever set."""
        policy = cls.objects.filter(effective_from__lte=first_of_month).first()
        return policy or cls(effective_from=first_of_month)


class CostEntry(UUIDPrimaryKeyModel, TimeStampedModel):
    """One real bill, against the department whose work caused it.

    Deliberately not an accounting package: no invoices, no approvals, no
    reconciliation, no VAT. One number per category per month, which is what
    the split needs and what makes it possible to see what MooreSkillUp costs
    to run next to what it earns.
    """

    CATEGORIES = (
        ("hosting", "Hosting and servers"),
        ("database", "Database"),
        ("storage", "Storage"),
        ("video", "Video"),
        ("email", "Email"),
        ("domain", "Domain and DNS"),
        ("tools", "Tools and subscriptions"),
        ("ad_spend", "Advertising"),
        ("equipment", "Equipment"),
        ("transport", "Transport"),
        ("data", "Data and airtime"),
        ("other", "Other"),
    )

    # The first of the month it belongs to, so a month is one date to match on.
    month = models.DateField()
    department = models.ForeignKey(
        "organization.Department", on_delete=models.PROTECT, related_name="costs"
    )
    category = models.CharField(max_length=30, choices=CATEGORIES, default="other")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    vendor = models.CharField(max_length=120, blank=True)
    note = models.CharField(max_length=255, blank=True)
    entered_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ("-month", "department__order", "category")
        verbose_name_plural = "cost entries"

    def __str__(self):
        return f"{self.month:%b %Y} {self.department.name}: {self.amount}"


class RevenuePeriod(UUIDPrimaryKeyModel, TimeStampedModel):
    """One month, computed from real sales and then frozen when it is closed."""

    OPEN = "open"
    CLOSED = "closed"
    STATUS_CHOICES = ((OPEN, "Open"), (CLOSED, "Closed"))

    month = models.DateField(unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=OPEN)

    gross = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    processor_fees = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    net_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    teacher_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    operations_pool = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    # What is left once the teachers and the pool are taken, then adjusted by
    # what the departments handed back and what the cost floor drew down.
    reserve_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    sale_count = models.PositiveIntegerField(default=0)
    # Sales fulfilled before the processor's fee was recorded. Their net is
    # optimistic by whatever the fee was, and it cannot be recovered — so the
    # count is kept where somebody reading the figures will see it.
    sales_missing_fee = models.PositiveIntegerField(default=0)

    policy = models.ForeignKey(
        "finance.SplitPolicy", null=True, blank=True, on_delete=models.SET_NULL, related_name="periods"
    )
    operations_percent_used = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("55.00")
    )

    closed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-month",)

    def __str__(self):
        return f"{self.month:%B %Y} ({self.status})"

    @property
    def is_closed(self):
        return self.status == self.CLOSED

    @property
    def total_costs(self):
        return sum((a.cost_total for a in self.allocations.all()), Decimal("0.00"))


class DepartmentAllocation(UUIDPrimaryKeyModel, TimeStampedModel):
    """What one department gets in one month, and how that number was reached.

    Every step is stored rather than recomputed, because "why did Design get
    ₦150,000?" is a question that gets asked months later, and the percentages
    and caps will have moved by then.
    """

    period = models.ForeignKey(
        "finance.RevenuePeriod", on_delete=models.CASCADE, related_name="allocations"
    )
    department = models.ForeignKey(
        "organization.Department", on_delete=models.PROTECT, related_name="allocations"
    )

    percent_used = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    calculated = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    cap_applied = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    # Its own bills plus its sub-departments', since a sub-department is paid
    # out of its parent's allocation.
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    actual = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    # Infrastructure's bill exceeding its share, topped up from the reserve.
    reserve_draw = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    # Held back by the cap, and returned to the reserve rather than becoming an
    # expectation next month.
    excess_returned = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ("department__order", "department__name")
        constraints = [
            models.UniqueConstraint(
                fields=("period", "department"), name="unique_department_per_period"
            )
        ]

    def __str__(self):
        return f"{self.department.name} {self.period.month:%b %Y}: {self.actual}"

    @property
    def is_over_cap(self):
        return self.excess_returned > 0

    @property
    def is_underfunded(self):
        """Its bills came to more than its share, whether or not it was topped up."""
        return self.cost_total > self.calculated
