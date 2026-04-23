from django.utils import timezone
from rest_framework import response, views

from common.permissions import IsAdminUserRole
from apps.accounts.models import User

from .models import BroadcastNotification, Notification
from .serializers import BroadcastNotificationSerializer, NotificationSerializer


class NotificationListView(views.APIView):
    def get(self, request):
        queryset = Notification.objects.filter(user=request.user).order_by("-created_at")
        return response.Response(NotificationSerializer(queryset, many=True).data)


class NotificationMarkAllReadView(views.APIView):
    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return response.Response({"detail": "Notifications marked as read.", "updated": updated})


class BroadcastCreateView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = BroadcastNotification.objects.filter(created_by=request.user).order_by("-created_at")
        return response.Response(BroadcastNotificationSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = BroadcastNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        broadcast = serializer.save(created_by=request.user, status="sent", sent_at=timezone.now())

        users = User.objects.none()
        if broadcast.audience == "students":
            users = User.objects.filter(role="student")
        elif broadcast.audience == "teachers":
            users = User.objects.filter(role="teacher")
        else:
            users = User.objects.all()

        Notification.objects.bulk_create(
            [
                Notification(
                    user=user,
                    title=broadcast.title,
                    body=broadcast.description,
                    kind="message",
                    expires_at=broadcast.expires_at,
                )
                for user in users
            ]
        )
        return response.Response(BroadcastNotificationSerializer(broadcast).data)

    def delete(self, request):
        deleted_count, _ = BroadcastNotification.objects.filter(created_by=request.user).delete()
        return response.Response({"detail": "Broadcast history cleared.", "deleted": deleted_count})
