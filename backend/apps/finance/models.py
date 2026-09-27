"""What each teacher agreed to, and what each course therefore earns them.

Two records, and the split between them is the point.

`TeacherTerms` is the deal a person signed: founding teachers take 25% on their
first two courses and 20% after that, teachers who join later start at 20%.
It can be changed, because a new agreement can be signed.

`CourseEarningTerm` is what one course actually pays, frozen on the day it is
published. It is never recalculated. A teacher's third course sits at 20% while
their first two stay at 25%, with nothing to renegotiate, and a statement sent
in December still says the same thing in March.
"""

from calendar import monthrange
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

FOUNDING = "founding"
STANDARD = "standard"
CUSTOM = "custom"

AGREEMENT_TYPES = (
    (FOUNDING, "Founding teacher"),
    (STANDARD, "Standard teacher"),
    (CUSTOM, "Custom"),
)

# What each type means unless someone edits it. Founding teachers signed before
# launch, when there were no students and no proof this would work; the higher
# rate on their first two courses is what they get instead of a creation fee.
TYPE_DEFAULTS = {
    FOUNDING: {
        "premium_share_percent": Decimal("25.00"),
        "premium_course_count": 2,
        "standard_share_percent": Decimal("20.00"),
        "creation_fee": Decimal("0.00"),
    },
    STANDARD: {
        "premium_share_percent": Decimal("20.00"),
        "premium_course_count": 0,
        "standard_share_percent": Decimal("20.00"),
        "creation_fee": Decimal("0.00"),
    },
}


def add_months(moment, months):
    """The same day of the month, `months` later, clamped to a real date.

    Written out rather than pulled from dateutil for one call: a 12-month
    earning period is a calendar year, not 365 days, and the difference shows
    up on every leap year.
    """
    month_index = moment.month - 1 + months
    year = moment.year + month_index // 12
    month = month_index % 12 + 1
    day = min(moment.day, monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


class TeacherTerms(UUIDPrimaryKeyModel, TimeStampedModel):
    """The agreement one teacher signed.

    Recorded when the teacher is created, so the percentage is captured at the
    moment it is agreed rather than reconstructed months later from memory.
    """

    teacher = models.OneToOneField(
        "accounts.TeacherProfile", on_delete=models.CASCADE, related_name="terms"
    )
    agreement_type = models.CharField(max_length=20, choices=AGREEMENT_TYPES, default=STANDARD)

    # The higher rate, and how many of their courses it covers. A founding
    # teacher is on 25% for two courses; setting the count to 0 means the
    # standard rate applies from their first course.
    premium_share_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    premium_course_count = models.PositiveSmallIntegerField(default=0)
    standard_share_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )

    # How long each course earns, counted from the day that course publishes —
    # not from the day the teacher signed.
    earning_months = models.PositiveSmallIntegerField(default=12)
    creation_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    agreement_version = models.CharField(max_length=40, blank=True)
    signed_on = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "teacher terms"

    def __str__(self):
        return f"{self.teacher.user.display_name}: {self.get_agreement_type_display()}"

    @classmethod
    def defaults_for(cls, agreement_type):
        return dict(TYPE_DEFAULTS.get(agreement_type, TYPE_DEFAULTS[STANDARD]))

    def share_for_course_number(self, number):
        """What their `number`-th published course earns, counting from 1."""
        if number <= self.premium_course_count:
            return self.premium_share_percent
        return self.standard_share_percent

    @property
    def premium_courses_used(self):
        return self.teacher.earning_terms.filter(
            share_percent=self.premium_share_percent
        ).count()

    @property
    def premium_courses_left(self):
        return max(self.premium_course_count - self.teacher.earning_terms.count(), 0)


class CourseEarningTerm(UUIDPrimaryKeyModel, TimeStampedModel):
    """What one course pays its creator, fixed on the day it was published.

    Frozen on purpose. Prices change, policies change, a teacher may later sign
    different terms — none of that may quietly move what an already-published
    course earns, or a statement stops meaning anything.
    """

    ROLE_CHOICES = (
        # The person who built it. The money follows them.
        ("creator", "Course creator"),
        # The person shown as teaching it. May change without moving the money.
        ("instructor", "Course instructor"),
    )

    course = models.OneToOneField(
        "courses.Course", on_delete=models.CASCADE, related_name="earning_term"
    )
    teacher = models.ForeignKey(
        "accounts.TeacherProfile", on_delete=models.SET_NULL, null=True, related_name="earning_terms"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="creator")

    share_percent = models.DecimalField(max_digits=5, decimal_places=2)
    # Their first, second, third course. Kept because it is what decided the
    # percentage, and without it nobody can check the figure a year later.
    course_number = models.PositiveSmallIntegerField(default=1)

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    # Set when an agreement ends for cause: earnings stop that day rather than
    # running to the end of the period.
    stopped_at = models.DateTimeField(null=True, blank=True)
    stopped_reason = models.CharField(max_length=255, blank=True)

    agreement_version = models.CharField(max_length=40, blank=True)
    # True when the course published before anyone recorded what the teacher
    # signed, so the standard rate was assumed. Surfaced in admin rather than
    # silently trusted — assuming 20% for someone who signed at 25% is the kind
    # of mistake that is only found when they query their first payment.
    needs_review = models.BooleanField(default=False)

    class Meta:
        ordering = ("-starts_at",)

    def __str__(self):
        return f"{self.course.title} @ {self.share_percent}%"

    def earns_on(self, moment):
        """Whether a sale made at `moment` earns this teacher anything."""
        if moment < self.starts_at or moment > self.ends_at:
            return False
        return self.stopped_at is None or moment < self.stopped_at

    @property
    def is_running(self):
        from django.utils import timezone

        return self.earns_on(timezone.now())


def freeze_terms_for(course):
    """Record what a course will pay, once, at publication.

    Called whenever a course becomes published, from whichever route did it.
    Doing nothing if a term already exists is what makes it safe to call from
    everywhere — republishing a course must not restart its 12 months or move
    it to a different rate.
    """
    if course.status != "published" or course.published_at is None:
        return None
    if course.teacher_id is None:
        return None
    existing = CourseEarningTerm.objects.filter(course=course).first()
    if existing is not None:
        return existing

    terms = TeacherTerms.objects.filter(teacher_id=course.teacher_id).first()
    needs_review = terms is None
    if terms is None:
        # No recorded agreement. Assume the standard rate rather than guessing
        # generously, and flag it so somebody confirms before the first payout.
        terms = TeacherTerms(
            teacher_id=course.teacher_id, **TeacherTerms.defaults_for(STANDARD)
        )

    course_number = (
        CourseEarningTerm.objects.filter(teacher_id=course.teacher_id).count() + 1
    )
    return CourseEarningTerm.objects.create(
        course=course,
        teacher_id=course.teacher_id,
        share_percent=terms.share_for_course_number(course_number),
        course_number=course_number,
        starts_at=course.published_at,
        ends_at=add_months(course.published_at, terms.earning_months),
        agreement_version=terms.agreement_version,
        needs_review=needs_review,
    )
