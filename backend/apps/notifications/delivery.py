"""Broadcast fan-out and lazy scheduled delivery.

There is no background worker in this deployment, so scheduled broadcasts are
delivered "lazily": any time notifications or broadcasts are listed, due
broadcasts get sent. A cron/Railway scheduled job can also call the
`send_due_broadcasts` management command for timely delivery.
"""

from django.db import models, transaction
from django.utils import timezone

from apps.accounts.models import User

from .models import BroadcastNotification, Notification


def audience_users(audience, track=""):
    """Who a broadcast is for.

    `track` narrows a student audience to one programme or track, so an
    announcement about a Backend cohort does not land on everybody learning
    design. It is ignored for audiences that are not students, because a teacher
    does not have a track in the sense a student does.
    """
    if audience == "students":
        users = User.objects.filter(role="student", is_active=True)
    elif audience == "teachers":
        return User.objects.filter(role="teacher", is_active=True)
    elif audience == "admins":
        return User.objects.filter(role="admin", is_active=True)
    elif audience == "moderators":
        return User.objects.filter(role="admin", admin_role="moderator", is_active=True)
    elif audience == "waitlist":
        users = User.objects.filter(
            role="student", is_active=True, student_profile__founding_member_number__isnull=False
        )
    else:
        return User.objects.filter(is_active=True)

    if track:
        users = users.filter(
            models.Q(student_profile__selected_track__iexact=track)
            | models.Q(student_profile__selected_interest__iexact=track)
        )
    return users


def fan_out_broadcast(broadcast):
    """Create one notification per targeted user and mark the broadcast sent."""
    recipients = audience_users(broadcast.audience, broadcast.audience_track)
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
    broadcast.recipient_count = recipients.count()
    broadcast.save(update_fields=["status", "sent_at", "recipient_count", "updated_at"])
    return broadcast.recipient_count


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


# How many emails one request will send before handing control back. Six hundred
# API calls do not fit in a web request, and a request that dies halfway is
# worse than one that finishes a batch and says how many are left.
EMAIL_BATCH = 120


def send_broadcast_emails(broadcast, limit=EMAIL_BATCH):
    """Email a batch of this broadcast's audience. Returns (sent, remaining).

    Resumable and safe to call again: anyone who already has a receipt is
    skipped, so a retry after a timeout continues rather than sending the launch
    announcement to the same six hundred people twice.
    """
    from common.email import frontend_url, send_transactional_email

    from .models import BroadcastEmailReceipt

    already = BroadcastEmailReceipt.objects.filter(broadcast=broadcast).values_list(
        "user_id", flat=True
    )
    pending = (
        audience_users(broadcast.audience, broadcast.audience_track)
        .exclude(id__in=already)
        .exclude(email="")
        .order_by("date_joined")
    )
    total_pending = pending.count()

    sent = 0
    for user in pending[:limit]:
        delivered = send_transactional_email(
            to_email=user.email,
            subject=broadcast.title,
            heading=broadcast.title,
            greeting=f"Hi {user.first_name or user.display_name},",
            intro=broadcast.description,
            button_label="Open MooreSkillUp",
            button_url=frontend_url("/dashboard"),
        )
        # A receipt either way: a failed address will fail again on every retry,
        # and retrying it forever would stall the batch behind one bad mailbox.
        BroadcastEmailReceipt.objects.get_or_create(
            broadcast=broadcast, user=user, defaults={"delivered": bool(delivered)}
        )
        sent += 1

    broadcast.emails_sent = BroadcastEmailReceipt.objects.filter(
        broadcast=broadcast, delivered=True
    ).count()
    broadcast.save(update_fields=["emails_sent", "updated_at"])
    return sent, max(0, total_pending - sent)
