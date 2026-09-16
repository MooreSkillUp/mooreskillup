from rest_framework import serializers

from .models import BroadcastNotification, Notification, SupportTicket, SupportTicketMessage


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
    expiresAt = serializers.DateTimeField(source="expires_at", required=False, allow_null=True)
    # Everyone's announcements are listed, so each says who sent it.
    sentByName = serializers.CharField(source="created_by.display_name", read_only=True, default="")
    recipientCount = serializers.IntegerField(source="recipient_count", read_only=True)

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
            "expiresAt",
            "expires_at",
            "sentByName",
            "recipientCount",
            "created_at",
        )
        read_only_fields = ("status",)


class SupportTicketMessageSerializer(serializers.ModelSerializer):
    isInternal = serializers.BooleanField(source="is_internal", read_only=True)
    authorName = serializers.CharField(source="author_name", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = SupportTicketMessage
        fields = ("id", "body", "isInternal", "authorName", "createdAt")


class SupportTicketSerializer(serializers.ModelSerializer):
    createdBy = serializers.CharField(source="created_by.display_name", read_only=True)
    createdByRole = serializers.CharField(source="created_by.role", read_only=True)
    messages = serializers.SerializerMethodField()
    assignedToName = serializers.CharField(source="assigned_to.display_name", read_only=True, default=None)
    assignedToId = serializers.CharField(source="assigned_to_id", read_only=True, default=None)
    assignedAt = serializers.DateTimeField(source="assigned_at", read_only=True)
    hoursWaiting = serializers.SerializerMethodField()
    isOverdue = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "category",
            "title",
            "description",
            "status",
            "priority",
            "messages",
            "assignedToName",
            "assignedToId",
            "assignedAt",
            "hoursWaiting",
            "isOverdue",
            "created_at",
            "updated_at",
            "createdBy",
            "createdByRole",
        )

    def _first_reply(self, obj):
        """The first message actually sent to the person who raised the ticket.

        A note between admins doesn't count: talking among ourselves is not
        answering someone who is waiting.
        """
        return next((message for message in obj.messages.all() if not message.is_internal), None)

    def get_hoursWaiting(self, obj):
        from django.utils import timezone

        reply = self._first_reply(obj)
        until = reply.created_at if reply else timezone.now()
        return round((until - obj.created_at).total_seconds() / 3600, 1)

    def get_isOverdue(self, obj):
        """Still unanswered, and past the reply target the Super Admin set."""
        from apps.platform.models import PlatformSettings

        target = PlatformSettings.get_solo().support_response_hours
        if not target or obj.status in {"resolved", "closed"}:
            return False
        if self._first_reply(obj):
            return False
        return self.get_hoursWaiting(obj) > target

    def get_messages(self, obj):
        """Replies always; notes only for the people handling the ticket.

        The caller states which it is. A ticket serialized without that context
        shows replies only, so a new endpoint can't leak notes by forgetting.
        """
        messages = list(obj.messages.all())
        if not self.context.get("include_internal"):
            messages = [message for message in messages if not message.is_internal]
        return SupportTicketMessageSerializer(messages, many=True).data
