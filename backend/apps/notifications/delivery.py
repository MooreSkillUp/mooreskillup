"""Broadcast fan-out and lazy scheduled delivery.

There is no background worker in this deployment, so scheduled broadcasts are
delivered "lazily": any time notifications or broadcasts are listed, due
broadcasts get sent. A cron/Railway scheduled job can also call the
`send_due_broadcasts` management command for timely delivery.
"""

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User

from .models import BroadcastNotification, Notification


def audience_users(audience):
    if audience == "students":
        return User.objects.filter(role="student", is_active=True)
    if audience == "teachers":
        return User.objects.filter(role="teacher", is_active=True)
    if audience == "admins":
        return User.objects.filter(role="admin", is_active=True)
    if audience == "moderators":
        return User.objects.filter(role="admin", admin_role="moderator", is_active=True)
    return User.objects.filter(is_active=True)


def fan_out_broadcast(broadcast):
    """Create one notification per targeted user and mark the broadcast sent."""
    recipients = audience_users(broadcast.audience)
    Notification.objects.bulk_create(
        [
            Notification(
                user=user,
                title=broadcast.title,
                body=broadcast.description,
                kind="message",
                expires_at=broadcast.expires_at,
            )
            for user in recipients
        ],
        batch_size=1000,
    )
    broadcast.status = "sent"
    broadcast.sent_at = timezone.now()
    broadcast.save(update_fields=["status", "sent_at", "updated_at"])
    return recipients.count()


def deliver_due_broadcasts():
    """Send every scheduled broadcast whose time has arrived. Returns count sent."""
    due = BroadcastNotification.objects.filter(status="scheduled", scheduled_at__lte=timezone.now())
    sent = 0
    for broadcast in due:
        with transaction.atomic():
            # Re-check inside the lock so two concurrent requests can't double-send.
            locked = (
                BroadcastNotification.objects.select_for_update()
                .filter(id=broadcast.id, status="scheduled")
                .first()
            )
            if locked is None:
                continue
            fan_out_broadcast(locked)
            sent += 1
    return sent
