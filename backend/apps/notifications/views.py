from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import response, status, views
from rest_framework.permissions import BasePermission

from common.permissions import IsStudentUserRole, IsTeacherUserRole
from common.rbac import AdminActionsPerMethod, get_admin_role, user_has_admin_permission
from apps.platform.audit import record_audit

from .delivery import deliver_due_broadcasts, fan_out_broadcast
from .models import BroadcastNotification, Notification, SupportTicket
from .serializers import BroadcastNotificationSerializer, NotificationSerializer, SupportTicketSerializer


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

        if get_admin_role(user) == "moderator" and PlatformSettings.get_solo().allow_moderator_announcements:
            return True
        return False


class NotificationListView(views.APIView):
    def get(self, request):
        deliver_due_broadcasts()
        queryset = Notification.objects.filter(user=request.user).order_by("-created_at")
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
        "DELETE": ("notifications:broadcast",),
    }

    def get_permissions(self):
        # POST also allowed for moderators when the announcement toggle is on.
        if self.request.method == "POST":
            return [CanBroadcast()]
        return super().get_permissions()

    def get(self, request):
        deliver_due_broadcasts()
        queryset = BroadcastNotification.objects.filter(created_by=request.user).order_by("-created_at")
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
            record_audit(
                request,
                "notification.broadcast",
                resource_type="notification",
                resource_id=broadcast.id,
                resource_name=broadcast.title,
                metadata={"audience": broadcast.audience, "recipients": recipients},
            )
        return response.Response(BroadcastNotificationSerializer(broadcast).data)

    def delete(self, request):
        deleted_count, _ = BroadcastNotification.objects.filter(created_by=request.user).delete()
        return response.Response({"detail": "Broadcast history cleared.", "deleted": deleted_count})


class BroadcastDetailView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("notifications:view",), "DELETE": ("notifications:broadcast",)}

    def get_object(self, request, broadcast_id):
        return get_object_or_404(BroadcastNotification, id=broadcast_id, created_by=request.user)

    def get(self, request, broadcast_id):
        broadcast = self.get_object(request, broadcast_id)
        return response.Response(BroadcastNotificationSerializer(broadcast).data)

    def delete(self, request, broadcast_id):
        broadcast = self.get_object(request, broadcast_id)
        broadcast.delete()
        return response.Response({"detail": "Notification deleted successfully."})


class AdminSupportTicketListView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("support:view",)}

    def get(self, request):
        queryset = SupportTicket.objects.select_related("created_by").all()
        return response.Response(SupportTicketSerializer(queryset, many=True).data)


class AdminSupportTicketDetailView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"PATCH": ("support:add-notes",), "DELETE": ("support:close",)}

    def patch(self, request, ticket_id):
        # Moderators may add notes, but resolving/closing needs support:close.
        if "status" in request.data and not user_has_admin_permission(request.user, "support:close"):
            return response.Response(
                {"detail": "You do not have permission to change ticket status."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ticket = get_object_or_404(SupportTicket, id=ticket_id)
        previous_status = ticket.status
        serializer = SupportTicketSerializer(ticket, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Let the person who raised the ticket know it was updated.
        from common.email import frontend_url, send_transactional_email

        Notification.objects.create(
            user=ticket.created_by,
            title=f"Support ticket updated: {ticket.title}",
            body=(ticket.admin_notes or f"Status changed to {ticket.get_status_display()}.")[:500],
            kind="message",
        )
        support_path = "/teacher/support" if ticket.created_by.role == "teacher" else "/support"
        send_transactional_email(
            to_email=ticket.created_by.email,
            subject=f"Update on your support ticket — {ticket.title}",
            heading="Your support ticket was updated",
            greeting=f"Hi {ticket.created_by.display_name},",
            intro=f"Our team updated your ticket “{ticket.title}”.",
            details=[
                {"label": "Status", "value": ticket.get_status_display()},
                {"label": "Reply", "value": ticket.admin_notes or "—"},
            ],
            button_label="View ticket",
            button_url=frontend_url(support_path),
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
        queryset = SupportTicket.objects.filter(created_by=request.user)
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
        from apps.platform.models import PlatformSettings
        from apps.enrollments.models import Enrollment

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
        enrollments = Enrollment.objects.filter(course__teacher=teacher)
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
        queryset = SupportTicket.objects.filter(created_by=request.user)
        return response.Response(SupportTicketSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SupportTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(created_by=request.user)
        return response.Response(SupportTicketSerializer(ticket).data)
