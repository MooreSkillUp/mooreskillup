from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import response, status, views
from rest_framework.permissions import BasePermission

from apps.platform.audit import record_audit
from common.permissions import IsStudentUserRole, IsTeacherUserRole
from common.rbac import AdminActionsPerMethod, get_admin_role, user_has_admin_permission

from .delivery import deliver_due_broadcasts, fan_out_broadcast
from .models import BroadcastNotification, Notification, SupportTicket, SupportTicketMessage
from .serializers import (
    BroadcastNotificationSerializer,
    NotificationSerializer,
    SupportTicketMessageSerializer,
    SupportTicketSerializer,
)


class CanBroadcast(BasePermission):
    """Admins/super-admins always; moderators only when the toggle is enabled."""

    message = "You do not have permission to send broadcasts."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        if user_has_admin_permission(user, "notifications:broadcast"):
            return True
        from apps.platform.models import PlatformSettings

        return get_admin_role(user) == "moderator" and PlatformSettings.get_solo().allow_moderator_announcements


class NotificationListView(views.APIView):
    def get(self, request):
        deliver_due_broadcasts()
        # An expiry date that nothing acted on: a notice set to expire stayed in
        # the bell for good, and the Broadcasts page promised it would go.
        queryset = (
            Notification.objects.filter(user=request.user)
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now()))
            .order_by("-created_at")
        )
        return response.Response(NotificationSerializer(queryset, many=True).data)


class NotificationMarkAllReadView(views.APIView):
    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return response.Response({"detail": "Notifications marked as read.", "updated": updated})


class NotificationClearView(views.APIView):
    def delete(self, request):
        deleted, _ = Notification.objects.filter(user=request.user).delete()
        return response.Response({"detail": "Notifications cleared.", "deleted": deleted})


class NotificationDetailView(views.APIView):
    def patch(self, request, notification_id):
        notification = get_object_or_404(Notification, id=notification_id, user=request.user)
        if "is_read" in request.data:
          notification.is_read = bool(request.data.get("is_read"))
          notification.save(update_fields=["is_read"])
        return response.Response(NotificationSerializer(notification).data)

    def delete(self, request, notification_id):
        notification = get_object_or_404(Notification, id=notification_id, user=request.user)
        notification.delete()
        return response.Response({"detail": "Notification deleted successfully."})


class BroadcastCreateView(AdminActionsPerMethod, views.APIView):
    admin_actions = {
        "GET": ("notifications:view",),
        "POST": ("notifications:broadcast",),
    }

    def get_permissions(self):
        # POST also allowed for moderators when the announcement toggle is on.
        if self.request.method == "POST":
            return [CanBroadcast()]
        return super().get_permissions()

    def get(self, request):
        deliver_due_broadcasts()
        # Everyone's, not just your own: two admins could otherwise announce the
        # same thing twice, each seeing an empty history.
        queryset = BroadcastNotification.objects.select_related("created_by").order_by("-created_at")
        return response.Response(BroadcastNotificationSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = BroadcastNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scheduled_at = serializer.validated_data.get("scheduled_at")

        if scheduled_at and scheduled_at > timezone.now():
            broadcast = serializer.save(created_by=request.user, status="scheduled")
            record_audit(
                request,
                "notification.schedule",
                resource_type="notification",
                resource_id=broadcast.id,
                resource_name=broadcast.title,
                metadata={"audience": broadcast.audience, "scheduledAt": scheduled_at.isoformat()},
            )
        else:
            broadcast = serializer.save(created_by=request.user)
            recipients = fan_out_broadcast(broadcast)
            if broadcast.send_email:
                from .delivery import send_broadcast_emails

                send_broadcast_emails(broadcast)
            record_audit(
                request,
                "notification.broadcast",
                resource_type="notification",
                resource_id=broadcast.id,
                resource_name=broadcast.title,
                metadata={"audience": broadcast.audience, "recipients": recipients},
            )
        return response.Response(BroadcastNotificationSerializer(broadcast).data)

    # No bulk delete. "Clear Notification History" wiped the record of what had
    # been announced — the one place an admin could check what people were
    # already told. Single entries can still be removed one at a time.


class BroadcastEmailSendView(AdminActionsPerMethod, views.APIView):
    """Email a batch of a broadcast's audience, and say what is left.

    Sending is deliberately in the caller's hands rather than automatic. Six
    hundred emails do not fit in one request, and an admin who can see "120
    sent, 480 to go" and press again knows more than one watching a spinner
    that may have died. Receipts make pressing again safe.
    """

    admin_actions = {"POST": ("notifications:broadcast",)}

    def post(self, request, broadcast_id):
        from .delivery import send_broadcast_emails

        broadcast = BroadcastNotification.objects.filter(id=broadcast_id).first()
        if broadcast is None:
            return response.Response(
                {"detail": "That announcement no longer exists."},
                status=status.HTTP_404_NOT_FOUND,
            )

        sent, remaining = send_broadcast_emails(broadcast)
        record_audit(
            request,
            "notification.broadcast",
            resource_type="notification",
            resource_id=broadcast.id,
            resource_name=broadcast.title,
            metadata={"emailed": sent, "remaining": remaining, "audience": broadcast.audience},
        )
        return response.Response(
            {
                "sent": sent,
                "remaining": remaining,
                "emailsSent": broadcast.emails_sent,
                "detail": (
                    f"Emailed {sent}. {remaining} to go — press again to continue."
                    if remaining
                    else f"Emailed {sent}. Everyone on this list has now been told."
                ),
            }
        )


class BroadcastDetailView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("notifications:view",), "DELETE": ("notifications:broadcast",)}

    def get_object(self, request, broadcast_id):
        # Not scoped to the sender: the history is shared, so tidying it can't
        # depend on who happened to press send.
        return get_object_or_404(BroadcastNotification, id=broadcast_id)

    def get(self, request, broadcast_id):
        broadcast = self.get_object(request, broadcast_id)
        return response.Response(BroadcastNotificationSerializer(broadcast).data)

    def delete(self, request, broadcast_id):
        broadcast = self.get_object(request, broadcast_id)
        broadcast.delete()
        return response.Response({"detail": "Notification deleted successfully."})


def tell_the_person(ticket, *, title, body, reply_body=None):
    """Notify whoever raised the ticket, in the app and by email.

    Never called with an internal note: the two paths that reach it are a reply
    the admin chose to send, and a status change.
    """
    from common.email import frontend_url, send_transactional_email

    Notification.objects.create(user=ticket.created_by, title=title, body=body[:500], kind="message")
    support_path = "/teacher/support" if ticket.created_by.role == "teacher" else "/support"
    details = [{"label": "Status", "value": ticket.get_status_display()}]
    if reply_body:
        details.append({"label": "Reply", "value": reply_body})
    send_transactional_email(
        to_email=ticket.created_by.email,
        subject=f"Your support ticket — {ticket.title}",
        heading=title,
        greeting=f"Hi {ticket.created_by.display_name},",
        intro=body,
        details=details,
        button_label="View ticket",
        button_url=frontend_url(support_path),
    )


class AdminSupportTicketListView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("support:view",)}

    def get(self, request):
        queryset = SupportTicket.objects.select_related("created_by").prefetch_related("messages")
        return response.Response(
            SupportTicketSerializer(queryset, many=True, context={"include_internal": True}).data
        )


class AdminSupportTicketMessageView(AdminActionsPerMethod, views.APIView):
    """Add to a ticket's thread — either a reply, or a note kept between admins."""

    admin_actions = {"POST": ("support:add-notes",)}

    def post(self, request, ticket_id):
        ticket = get_object_or_404(
            SupportTicket.objects.select_related("created_by").prefetch_related("messages"), id=ticket_id
        )
        body = (request.data.get("body") or "").strip()
        if not body:
            return response.Response(
                {"detail": "Write something first."}, status=status.HTTP_400_BAD_REQUEST
            )
        is_internal = bool(request.data.get("isInternal"))

        message = SupportTicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            author_name=request.user.display_name,
            body=body,
            is_internal=is_internal,
        )
        if not is_internal:
            tell_the_person(
                ticket,
                title=f"Support replied about “{ticket.title}”",
                body=body,
                reply_body=body,
            )
        record_audit(
            request,
            "support.note" if is_internal else "support.reply",
            resource_type="support",
            resource_id=ticket.id,
            resource_name=ticket.title,
        )
        return response.Response(
            SupportTicketMessageSerializer(message).data, status=status.HTTP_201_CREATED
        )


class AdminSupportTicketAssignView(AdminActionsPerMethod, views.APIView):
    """Take a ticket, or hand it back. The person who raised it isn't told:
    who is handling it is our business, not an update on their problem."""

    admin_actions = {"POST": ("support:assign",)}

    def post(self, request, ticket_id):
        ticket = get_object_or_404(
            SupportTicket.objects.select_related("created_by", "assigned_to").prefetch_related("messages"),
            id=ticket_id,
        )
        take = bool(request.data.get("assign", True))
        ticket.assigned_to = request.user if take else None
        ticket.assigned_at = timezone.now() if take else None
        ticket.save(update_fields=["assigned_to", "assigned_at", "updated_at"])
        record_audit(
            request,
            "support.assign" if take else "support.unassign",
            resource_type="support",
            resource_id=ticket.id,
            resource_name=ticket.title,
        )
        return response.Response(
            SupportTicketSerializer(ticket, context={"include_internal": True}).data
        )


class AdminSupportTicketDetailView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"PATCH": ("support:add-notes",), "DELETE": ("support:close",)}

    def patch(self, request, ticket_id):
        # Moderators may add notes, but resolving/closing needs support:close.
        if "status" in request.data and not user_has_admin_permission(request.user, "support:close"):
            if request.data.get("status") == "in_progress" and user_has_admin_permission(
                request.user, "support:add-notes"
            ):
                pass
            else:
                return response.Response(
                    {"detail": "You do not have permission to change ticket status."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        ticket = get_object_or_404(SupportTicket, id=ticket_id)
        previous_status = ticket.status
        serializer = SupportTicketSerializer(
            ticket, data=request.data, partial=True, context={"include_internal": True}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Only a status change concerns the person who raised the ticket.
        # Priority and category are housekeeping, and used to email them too.
        if ticket.status != previous_status:
            tell_the_person(
                ticket,
                title=f"Your ticket is now {ticket.get_status_display().lower()}",
                body=f"“{ticket.title}” was marked {ticket.get_status_display().lower()}.",
            )

        record_audit(
            request,
            "support.update",
            resource_type="support",
            resource_id=ticket.id,
            resource_name=ticket.title,
            changes=(
                {"status": {"before": previous_status, "after": ticket.status}}
                if previous_status != ticket.status
                else {}
            ),
        )
        return response.Response(serializer.data)

    def delete(self, request, ticket_id):
        ticket = get_object_or_404(SupportTicket, id=ticket_id)
        record_audit(
            request,
            "support.delete",
            resource_type="support",
            resource_id=ticket.id,
            resource_name=ticket.title,
        )
        ticket.delete()
        return response.Response({"detail": "Support ticket deleted successfully."})


class StudentSupportTicketListView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        queryset = SupportTicket.objects.filter(created_by=request.user).prefetch_related("messages")
        return response.Response(SupportTicketSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SupportTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(created_by=request.user)
        return response.Response(SupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class TeacherAnnouncementView(views.APIView):
    """A teacher announces to students enrolled in their courses (when allowed)."""

    permission_classes = [IsTeacherUserRole]

    def post(self, request):
        from apps.enrollments.models import Enrollment
        from apps.platform.models import PlatformSettings

        if not PlatformSettings.get_solo().allow_teacher_announcements:
            return response.Response(
                {"detail": "Teacher announcements are turned off by the admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        title = (request.data.get("title") or "").strip()
        body = (request.data.get("description") or request.data.get("body") or "").strip()
        if not title or not body:
            return response.Response(
                {"detail": "Title and message are required."}, status=status.HTTP_400_BAD_REQUEST
            )

        teacher = request.user.teacher_profile
        enrollments = Enrollment.objects.with_access().filter(course__teacher=teacher)
        course_id = request.data.get("courseId")
        if course_id:
            enrollments = enrollments.filter(course_id=course_id)

        student_user_ids = list(
            enrollments.values_list("student__user_id", flat=True).distinct()
        )
        from apps.accounts.models import User

        recipients = User.objects.filter(id__in=student_user_ids, is_active=True)
        Notification.objects.bulk_create(
            [
                Notification(user=user, title=title, body=body, kind="message")
                for user in recipients
            ],
            batch_size=1000,
        )
        return response.Response(
            {"detail": "Announcement sent.", "recipients": recipients.count()},
            status=status.HTTP_201_CREATED,
        )


class TeacherSupportTicketListView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        queryset = SupportTicket.objects.filter(created_by=request.user).prefetch_related("messages")
        return response.Response(SupportTicketSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SupportTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(created_by=request.user)
        return response.Response(SupportTicketSerializer(ticket).data)
