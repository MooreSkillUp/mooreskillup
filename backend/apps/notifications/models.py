from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Notification(UUIDPrimaryKeyModel, TimeStampedModel):
    KIND_CHOICES = (("course", "Course"), ("payment", "Payment"), ("message", "Message"), ("reward", "Reward"))

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField()
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="message")
    is_read = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)


class BroadcastNotification(UUIDPrimaryKeyModel, TimeStampedModel):
    AUDIENCE_CHOICES = (
        ("students", "Students"),
        ("teachers", "Teachers"),
        ("admins", "Admins"),
        ("moderators", "Moderators"),
        ("all", "All"),
    )
    STATUS_CHOICES = (("draft", "Draft"), ("scheduled", "Scheduled"), ("sent", "Sent"))

    created_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="created_broadcasts")
    title = models.CharField(max_length=255)
    description = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)


class SupportTicket(UUIDPrimaryKeyModel, TimeStampedModel):
    CATEGORY_CHOICES = (
        ("payment", "Payment Issue"),
        ("technical", "Technical Problem"),
        ("course", "Course Access Problem"),
        ("student", "Student Report"),
        ("account", "Account Recovery"),
        ("other", "Other"),
    )
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    )
    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    )

    created_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="support_tickets")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
