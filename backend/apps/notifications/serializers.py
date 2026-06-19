from rest_framework import serializers

from .models import BroadcastNotification, Notification, SupportTicket


class NotificationSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    def get_sender(self, obj):
        return "MSU-Admin" if obj.kind == "message" else "MooreSkillUp"

    class Meta:
        model = Notification
        fields = ("id", "title", "body", "kind", "is_read", "expires_at", "created_at", "createdAt", "sender")


class BroadcastNotificationSerializer(serializers.ModelSerializer):
    sentAt = serializers.DateTimeField(source="sent_at", read_only=True)
    scheduledAt = serializers.DateTimeField(source="scheduled_at", required=False, allow_null=True)

    class Meta:
        model = BroadcastNotification
        fields = (
            "id",
            "title",
            "description",
            "audience",
            "status",
            "scheduledAt",
            "sent_at",
            "sentAt",
            "expires_at",
            "created_at",
        )
        read_only_fields = ("status",)


class SupportTicketSerializer(serializers.ModelSerializer):
    createdBy = serializers.CharField(source="created_by.display_name", read_only=True)
    createdByRole = serializers.CharField(source="created_by.role", read_only=True)

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "category",
            "title",
            "description",
            "status",
            "priority",
            "admin_notes",
            "created_at",
            "updated_at",
            "createdBy",
            "createdByRole",
        )
