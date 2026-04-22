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
    AUDIENCE_CHOICES = (("students", "Students"), ("teachers", "Teachers"), ("all", "All"))
    STATUS_CHOICES = (("draft", "Draft"), ("sent", "Sent"))

    created_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="created_broadcasts")
    title = models.CharField(max_length=255)
    description = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
