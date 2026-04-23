from rest_framework import serializers

from .models import BroadcastNotification, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "body", "kind", "is_read", "expires_at", "created_at")


class BroadcastNotificationSerializer(serializers.ModelSerializer):
    sentAt = serializers.DateTimeField(source="sent_at", read_only=True)

    class Meta:
        model = BroadcastNotification
        fields = (
            "id",
            "title",
            "description",
            "audience",
            "status",
            "sent_at",
            "sentAt",
            "expires_at",
            "created_at",
        )
