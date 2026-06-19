from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

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
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    # Per-admin permission tweaks layered on top of the tier matrix:
    # {"grant": ["perm", ...], "revoke": ["perm", ...]}.
    permission_overrides = models.JSONField(default=dict, blank=True)
    # Opt-in email one-time-code 2FA for admin accounts.
    two_factor_enabled = models.BooleanField(default=False)

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
