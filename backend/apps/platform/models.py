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
    feature_quiz_enabled = models.BooleanField(default=False)
    # Refund policy: refundable only within N days AND under X% course progress.
    refund_window_days = models.PositiveIntegerField(default=14)
    refund_max_progress_percent = models.PositiveIntegerField(default=30)
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
    max_student_devices = models.PositiveIntegerField(default=2)
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
