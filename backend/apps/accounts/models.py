from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from common.models import TimeStampedModel, UUIDPrimaryKeyModel
from common.rbac import ADMIN_ROLE_CHOICES, SUPER_ADMIN


class UserManager(BaseUserManager):
    def create_user(self, email, username, display_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        if not username:
            raise ValueError("Username is required.")
        if not display_name:
            raise ValueError("Display name is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, display_name=display_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, display_name, password=None, **extra_fields):
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("admin_role", SUPER_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, username, display_name, password, **extra_fields)


class User(UUIDPrimaryKeyModel, AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    display_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    # Admin tier; only meaningful when role == "admin" (see common/rbac.py).
    admin_role = models.CharField(max_length=20, choices=ADMIN_ROLE_CHOICES, null=True, blank=True)
    avatar = models.CharField(max_length=10, blank=True)
    # Stores a predefined avatar key (e.g. "av-blue"), not a real URL — the name
    # is kept for backwards compatibility with existing DB rows and the frontend.
    avatar_url = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    # Per-admin permission tweaks layered on top of the tier matrix:
    # {"grant": ["perm", ...], "revoke": ["perm", ...]}.
    permission_overrides = models.JSONField(default=dict, blank=True)
    # Opt-in email one-time-code 2FA for admin accounts.
    two_factor_enabled = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "display_name"]

    objects = UserManager()

    def save(self, *args, **kwargs):
        if not self.avatar and self.display_name:
            parts = [part[0] for part in self.display_name.split()[:2] if part]
            self.avatar = "".join(parts).upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())


class TeacherProfile(UUIDPrimaryKeyModel, TimeStampedModel):
    STATUS_CHOICES = (("active", "Active"), ("inactive", "Inactive"))

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="teacher_profile")
    program = models.CharField(max_length=100)
    track = models.CharField(max_length=100)
    tracks = models.JSONField(default=list, blank=True)
    bio = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    must_change_password = models.BooleanField(default=False)

    def __str__(self):
        return self.user.display_name


class StudentProfile(UUIDPrimaryKeyModel, TimeStampedModel):
    PLAN_CHOICES = (("free", "Free"), ("pro", "Pro"), ("premium", "Premium"))

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="student_profile")
    selected_interest = models.CharField(max_length=100, blank=True)
    selected_track = models.CharField(max_length=100, blank=True)
    selected_tracks = models.JSONField(default=list, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    onboarded = models.BooleanField(default=False)

    def __str__(self):
        return self.user.display_name


class PasswordResetToken(UUIDPrimaryKeyModel, TimeStampedModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)


class EmailOtp(UUIDPrimaryKeyModel, TimeStampedModel):
    """Short-lived one-time code emailed for 2FA sign-in."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="email_otps")
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)


class PendingRegistration(UUIDPrimaryKeyModel, TimeStampedModel):
    """Temporary storage for public registration data before email verification."""

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    display_name = models.CharField(max_length=255)
    password = models.CharField(max_length=255)  # Hashed password
    role = models.CharField(max_length=20, default="student")
    selected_interest = models.CharField(max_length=100, blank=True)
    selected_track = models.CharField(max_length=100, blank=True)
    selected_tracks = models.JSONField(default=list, blank=True)
    plan = models.CharField(max_length=20, default="free")
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Pending: {self.email} ({self.code})"


class UserSession(UUIDPrimaryKeyModel, TimeStampedModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="sessions")
    session_key = models.CharField(max_length=64, unique=True)
    refresh_jti = models.CharField(max_length=64, unique=True)
    user_agent = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-last_active",)
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["session_key"]),
            models.Index(fields=["refresh_jti"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} session {self.session_key}"

    def is_expired(self):
        return self.expires_at <= timezone.now()

