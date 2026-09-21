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
        # Everyone who joined before launch day. The one audience that has to be
        # reachable on the morning you open, and the one an in-app notification
        # cannot reach, because they have not signed in for a month.
        ("waitlist", "Founding members"),
        ("all", "All"),
    )
    STATUS_CHOICES = (("draft", "Draft"), ("scheduled", "Scheduled"), ("sent", "Sent"))

    created_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="created_broadcasts")
    title = models.CharField(max_length=255)
    description = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES)
    # Narrow a student audience to one programme or track. Empty means everyone
    # in the audience above.
    audience_track = models.CharField(max_length=100, blank=True, default="")
    # A notification reaches whoever signs in. An email reaches whoever does
    # not, which before launch is almost everybody.
    send_email = models.BooleanField(default=False)
    emails_sent = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    # How many people it actually reached. The history could say who sent it and
    # when, but never how many were told.
    recipient_count = models.PositiveIntegerField(default=0)


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
    # "Assign to me" sent a field the model never had, so every ticket stayed
    # unowned however many times it was clicked.
    assigned_to = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tickets"
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)


class SupportTicketMessage(UUIDPrimaryKeyModel, TimeStampedModel):
    """One entry in a ticket's thread — either a reply or a note kept back.

    This replaces a single `admin_notes` box that the admin screen labelled
    "internal" while the backend emailed its contents to the person who raised
    the ticket and printed them on their own page under "Support reply".
    """

    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    # The note outlives the admin who wrote it, so the name is kept alongside.
    author = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="support_messages"
    )
    author_name = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    is_internal = models.BooleanField(default=False)

    class Meta:
        ordering = ("created_at",)


class BroadcastEmailReceipt(UUIDPrimaryKeyModel, TimeStampedModel):
    """Proof that one person was emailed one broadcast.

    Six hundred emails cannot be sent inside a web request, so they go in
    batches and the sending can be resumed. Without a per-person record a resume
    means somebody gets the launch announcement twice, which is the one mistake
    everybody on the list would notice at once.
    """

    broadcast = models.ForeignKey(
        "notifications.BroadcastNotification", on_delete=models.CASCADE, related_name="receipts"
    )
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="+")
    delivered = models.BooleanField(default=True)

    class Meta:
        unique_together = ("broadcast", "user")

    def __str__(self):
        return f"{self.broadcast_id} -> {self.user_id}"
