"""The company's own shape: departments, the people in them, and what each is owed.

MooreSkillUp shares revenue by department. Net revenue splits into a teacher
share, a company reserve and an operations pool, and the pool is divided across
departments by percentage and then capped. That model only works if the
percentages, the caps and the people live somewhere the platform can read, next
to the sales the split is calculated from — a spreadsheet beside the database is
how two sets of numbers start disagreeing.

Nothing here computes money. These are the inputs: the structure, the agreed
percentages, and who is in each department. The monthly calculation, the costs
and the payouts come later and read from these records.
"""

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


def _mask_account(number):
    """Show only the last four digits. Used everywhere but the one endpoint
    that is allowed to return the whole thing."""
    digits = "".join(ch for ch in str(number or "") if ch.isdigit())
    if not digits:
        return ""
    return "•" * max(len(digits) - 4, 0) + digits[-4:]


class Department(UUIDPrimaryKeyModel, TimeStampedModel):
    """A share of the operations pool, with a remit and a lead.

    A department is a budget line, not a group of people — several departments
    can share one lead, which is how eight departments work across five leads
    without inventing departments of one.

    Sub-departments (a `parent` set) carry no percentage of their own. The
    Promotion Squad sits under Marketing & Social and is paid, if at all, out of
    its parent's allocation: volunteers who are occasionally given something,
    not a line in the split.
    """

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    parent = models.ForeignKey(
        "organization.Department",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    # Share of the operations pool. Only meaningful on a top-level department.
    percent_of_pool = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    # The most this department may draw in a month, whatever the percentage
    # works out to. Null means uncapped. Anything above the cap goes back to
    # the company reserve rather than becoming an expectation.
    monthly_cap = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Infrastructure is the one department whose allocation is an invoice that
    # arrives whether or not it is funded. It takes the higher of its
    # percentage or the month's actual cost, and any shortfall is drawn from
    # the reserve — so the platform can never go dark because a percentage came
    # out small.
    is_cost_floor = models.BooleanField(default=False)
    lead = models.ForeignKey(
        "organization.TeamMember",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="departments_led",
    )
    remit = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "name")

    def __str__(self):
        return self.name

    @property
    def is_sub_department(self):
        return self.parent_id is not None

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:140]
        # A sub-department draws from its parent, so a percentage on it would
        # silently double-count against the pool.
        if self.parent_id is not None:
            self.percent_of_pool = Decimal("0.00")
            self.is_cost_floor = False
        super().save(*args, **kwargs)

    @classmethod
    def pool_percent_total(cls):
        """What the active top-level percentages add up to.

        Not enforced as a constraint: the Super Admin edits these one at a time
        and would otherwise be blocked halfway through. The admin screens show
        the total so a mistake is visible, which is the useful half.
        """
        total = cls.objects.filter(is_active=True, parent__isnull=True).aggregate(
            total=models.Sum("percent_of_pool")
        )["total"]
        # Quantized because Sum drops trailing zeros, and an API that says
        # "40" one day and "40.00" the next is a nuisance to render.
        return (total or Decimal("0")).quantize(Decimal("0.01"))


class TeamMember(UUIDPrimaryKeyModel, TimeStampedModel):
    """Someone working on MooreSkillUp, whether or not they have a login.

    Most of the team never needs a platform account: the designer and the video
    lead have no reason to sign in, so `user` stays null for them. Access
    follows the job, not the org chart.

    Bank details live here because the Super Admin pays these people and asked
    to hold them in one place. They are readable through exactly one endpoint,
    masked everywhere else, and every change is recorded — see
    TeamMemberBankChange for why.
    """

    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("left", "Left"),
    )

    full_name = models.CharField(max_length=160)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="team_memberships",
    )
    role_title = models.CharField(max_length=140, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    joined_on = models.DateField(null=True, blank=True)
    left_on = models.DateField(null=True, blank=True)
    # Which version of the team agreement they signed, and when. The same
    # pattern as student terms acceptance: what they agreed to, not just that
    # they agreed.
    agreement_version = models.CharField(max_length=40, blank=True)
    agreement_signed_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    account_name = models.CharField(max_length=160, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    account_number = models.CharField(max_length=40, blank=True)
    bank_verified_at = models.DateTimeField(null=True, blank=True)
    bank_verified_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ("full_name",)

    def __str__(self):
        return self.full_name

    @property
    def masked_account_number(self):
        return _mask_account(self.account_number)

    @property
    def has_bank_details(self):
        return bool(self.account_number and self.bank_name)

    @property
    def is_lead(self):
        return self.memberships.filter(is_lead=True, is_active=True).exists()


class TeamMemberBankChange(UUIDPrimaryKeyModel, TimeStampedModel):
    """Every edit to where someone's money goes.

    The attack on a payouts system is not stealing money, it is quietly
    changing the destination days before a payment run. So a change is recorded,
    it clears verification, and only masked values are stored here — an audit
    log that leaks the account numbers it exists to protect would be worse than
    no log at all.
    """

    team_member = models.ForeignKey(
        "organization.TeamMember", on_delete=models.CASCADE, related_name="bank_changes"
    )
    changed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    field = models.CharField(max_length=40)
    old_value = models.CharField(max_length=160, blank=True)
    new_value = models.CharField(max_length=160, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.team_member.full_name}: {self.field}"


class DepartmentMembership(UUIDPrimaryKeyModel, TimeStampedModel):
    """One person's place in one department, and what they earn from it.

    Someone can sit in two departments — that is how a lead holds Content and
    Marketing & Social at once. The basis lives on the membership rather than
    the person, because the same person may be paid a share of one department
    and nothing at all in another.
    """

    BASIS_CHOICES = (
        # A percentage of whatever that department actually receives this month.
        ("percent_of_department", "Percent of the department's allocation"),
        # A flat naira amount, as long as the department's allocation covers it.
        ("fixed", "Fixed monthly amount"),
        # Volunteers, and anyone not on a standing arrangement. They may still
        # be given something out of the department's allocation; it just is not
        # owed to them every month.
        ("none", "Nothing standing"),
    )

    team_member = models.ForeignKey(
        "organization.TeamMember", on_delete=models.CASCADE, related_name="memberships"
    )
    department = models.ForeignKey(
        "organization.Department", on_delete=models.CASCADE, related_name="memberships"
    )
    is_lead = models.BooleanField(default=False)
    share_basis = models.CharField(max_length=30, choices=BASIS_CHOICES, default="none")
    # A percentage when the basis is percent_of_department, a naira amount when
    # it is fixed, ignored when it is none.
    share_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    # The most this person may draw from this department in a month, whatever
    # their share works out to. Applies to leads as much as anyone.
    monthly_cap = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("department__order", "-is_lead", "team_member__full_name")
        constraints = [
            models.UniqueConstraint(
                fields=("team_member", "department"), name="unique_member_per_department"
            )
        ]

    def __str__(self):
        return f"{self.team_member.full_name} in {self.department.name}"
