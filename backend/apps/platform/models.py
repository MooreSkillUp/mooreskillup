from django.core.cache import cache
from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

SETTINGS_CACHE_KEY = "platform-settings"
SETTINGS_CACHE_SECONDS = 60


class AuditLog(UUIDPrimaryKeyModel, TimeStampedModel):
    STATUS_CHOICES = (("success", "Success"), ("failed", "Failed"))

    # SET_NULL + snapshot fields: the log entry must survive actor deletion.
    actor = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs"
    )
    actor_email = models.EmailField(blank=True)
    actor_name = models.CharField(max_length=255, blank=True)
    actor_role = models.CharField(max_length=30, blank=True)
    action = models.CharField(max_length=60)
    resource_type = models.CharField(max_length=60, blank=True)
    resource_id = models.CharField(max_length=64, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["actor_email"]),
            models.Index(fields=["resource_type"]),
        ]

    def __str__(self):
        return f"{self.actor_email or 'system'}: {self.action}"


def assign_founding_number(student):
    """Give a pre-launch signup the next founding-member number.

    Sequential and gap-free enough to be meaningful on screen: "founding member
    #312" has to mean 311 people came first, or it is decoration. Taken under a
    row lock so two simultaneous signups cannot claim the same number.
    """
    from django.db import transaction

    from apps.accounts.models import StudentProfile

    with transaction.atomic():
        highest = (
            StudentProfile.objects.select_for_update()
            .filter(founding_member_number__isnull=False)
            .order_by("-founding_member_number")
            .values_list("founding_member_number", flat=True)
            .first()
        )
        student.founding_member_number = (highest or 0) + 1
        student.save(update_fields=["founding_member_number", "updated_at"])
    return student.founding_member_number


class PlatformSettings(models.Model):
    """Single-row table holding platform-wide configuration.

    Only settings the backend actually enforces belong here — no dead toggles.
    """

    site_name = models.CharField(max_length=120, default="MooreSkillUp")
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.CharField(
        max_length=255,
        blank=True,
        default="We are performing scheduled maintenance. Please check back soon.",
    )
    student_registration_open = models.BooleanField(default=True)
    # --- Launch control -----------------------------------------------------
    #
    # Before launch the platform shows a countdown instead of a sign-up form,
    # and on the day it opens itself: a Super Admin flips launch_state to
    # "live" and the same app becomes registration and sign-in, with nobody
    # editing code or deleting a page. Maintenance mode stays separate, because
    # it is an override that applies in either state.
    # Three states, not two. "Founding beta" is the window where the people who
    # signed up before launch — and only them — can buy at the founding price.
    LAUNCH_STATES = (
        ("pre_launch", "Pre-launch"),
        ("founding_beta", "Founding beta"),
        ("live", "Live"),
    )
    launch_state = models.CharField(max_length=20, choices=LAUNCH_STATES, default="live")
    launch_at = models.DateTimeField(null=True, blank=True)
    countdown_enabled = models.BooleanField(default=True)
    launch_headline = models.CharField(max_length=120, default="Something is coming")
    launch_message = models.CharField(
        max_length=400,
        blank=True,
        default="MooreSkillUp opens soon. Practical, job-ready skills taught by people who do the work.",
    )
    launch_cta_label = models.CharField(max_length=60, blank=True, default="")
    launch_cta_url = models.CharField(max_length=300, blank=True, default="")
    # Sign-in can be closed to students while the team keeps working. Admins are
    # never locked out by it — a switch that can strand every administrator is
    # not a switch, it is an outage.
    sign_in_enabled = models.BooleanField(default=True)
    # Where the community actually lives. Nigeria runs on WhatsApp, so a waiting
    # member with nothing to learn yet still has somewhere to be.
    community_url = models.CharField(max_length=300, blank=True, default="")
    community_label = models.CharField(
        max_length=80, blank=True, default="Join the WhatsApp community"
    )
    # What referring actually gets you. Thresholds rather than prose, so the
    # screen and the reward cannot drift apart, and editable because none of
    # this is settled.
    referral_rewards_enabled = models.BooleanField(default=True)
    referral_early_access_at = models.PositiveIntegerField(default=3)
    referral_free_course_at = models.PositiveIntegerField(default=10)

    audit_retention_days = models.PositiveIntegerField(default=90)
    # Course approval hierarchy: when on, a moderator's approval moves a course to
    # "approved" (awaiting an admin/super-admin) instead of publishing it directly.
    require_admin_second_approval = models.BooleanField(default=False)
    # Announcement permissions (default: only admins can broadcast).
    allow_teacher_announcements = models.BooleanField(default=False)
    allow_moderator_announcements = models.BooleanField(default=False)
    # Student-facing feature flags (centralized; super-admin controlled).
    feature_reviews_enabled = models.BooleanField(default=True)
    feature_certificates_enabled = models.BooleanField(default=True)
    feature_recommendations_enabled = models.BooleanField(default=True)
    feature_achievements_enabled = models.BooleanField(default=False)
    feature_leaderboard_enabled = models.BooleanField(default=False)
    # The Quiz Shop page only. Course quizzes and finals are never gated by it.
    feature_quiz_enabled = models.BooleanField(default=False)
    default_course_banner_theme = models.CharField(max_length=40, default="default")
    default_course_banner_accent = models.CharField(max_length=20, default="#FC6104")
    default_course_banner_text_color = models.CharField(max_length=20, default="#FFFFFF")
    # Refund policy: refundable only within N days AND under X% course progress.
    refund_window_days = models.PositiveIntegerField(default=14)
    refund_max_progress_percent = models.PositiveIntegerField(default=30)
    # Two-factor was a personal choice each admin made for themselves, so it
    # could not be required of anyone — on accounts that can refund money,
    # delete a student and message the whole platform.
    require_admin_two_factor = models.BooleanField(default=False)
    # A switch for taking money, separate from whether Paystack is configured.
    # Stopping checkout otherwise meant removing the key and redeploying, which
    # is no use during an outage or a pricing mistake.
    payments_enabled = models.BooleanField(default=True)
    # What we tell someone raising a ticket, and the line after which a ticket
    # counts as overdue. 0 means we promise nothing.
    support_response_hours = models.PositiveIntegerField(default=24)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Platform settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete(SETTINGS_CACHE_KEY)

    @classmethod
    def get_solo(cls):
        cached = cache.get(SETTINGS_CACHE_KEY)
        if cached is not None:
            return cached
        instance, _ = cls.objects.get_or_create(pk=1)
        cache.set(SETTINGS_CACHE_KEY, instance, SETTINGS_CACHE_SECONDS)
        return instance

    def __str__(self):
        return self.site_name


class AuthenticationSettings(models.Model):
    # Students legitimately use a phone, a laptop and a tablet, often with two
    # browsers between them. A tight cap silently signed them out of the oldest
    # device with no explanation, which read as "the app logs me out randomly".
    # The cap still exists so one shared password cannot serve a whole class.
    max_student_devices = models.PositiveIntegerField(default=5)
    max_teacher_devices = models.PositiveIntegerField(default=3)
    max_admin_devices = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Authentication settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance

    def __str__(self):
        return "Authentication settings"


class LegalDocument(models.Model):
    """Terms of Service, Privacy Policy and Refund Policy, written in the admin.

    Hosted here rather than on the website so the text people agree to at
    signup is the text a Super Admin controls, in one place, with a history.

    Every published change bumps the version. An acceptance records the
    versions in force at that moment, so "they agreed" always answers "to
    what" — the question a dispute turns on.
    """

    KINDS = (
        ("terms", "Terms of Service"),
        ("privacy", "Privacy Policy"),
        ("refund", "Refund Policy"),
    )

    kind = models.CharField(max_length=20, choices=KINDS, unique=True)
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True, default="")
    version = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} v{self.version}"

    @property
    def is_published(self):
        return self.version > 0 and bool(self.body.strip())

    @classmethod
    def for_kind(cls, kind):
        title = dict(cls.KINDS)[kind]
        document, _ = cls.objects.get_or_create(kind=kind, defaults={"title": title})
        return document


def current_legal_version():
    """What somebody agrees to when they tick the box today.

    Terms and privacy together, because the checkbox covers both. Reads like
    "terms-v3/privacy-v2"; before anything is published it is "unpublished",
    which is itself worth recording.
    """
    versions = dict(
        LegalDocument.objects.filter(kind__in=("terms", "privacy")).values_list("kind", "version")
    )
    terms, privacy = versions.get("terms", 0), versions.get("privacy", 0)
    if not terms and not privacy:
        return "unpublished"
    return f"terms-v{terms}/privacy-v{privacy}"
