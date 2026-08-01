from rest_framework import serializers

from apps.courses.models import Course

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    courseTitle = serializers.CharField(source="course.title", read_only=True, default="")
    courseId = serializers.UUIDField(source="course.id", read_only=True, default=None)
    startsAt = serializers.DateTimeField(source="starts_at")
    endsAt = serializers.DateTimeField(source="ends_at", required=False, allow_null=True)
    joinUrl = serializers.URLField(source="join_url", required=False, allow_blank=True)
    isPublished = serializers.BooleanField(source="is_published", required=False)
    isCancelled = serializers.BooleanField(source="is_cancelled", required=False)
    isPlatformWide = serializers.BooleanField(source="is_platform_wide", read_only=True)
    createdByName = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "description",
            "kind",
            "startsAt",
            "endsAt",
            "course",
            "courseId",
            "courseTitle",
            "joinUrl",
            "location",
            "isPublished",
            "isCancelled",
            "isPlatformWide",
            "createdByName",
        )
        extra_kwargs = {"course": {"required": False, "allow_null": True, "write_only": True}}

    def get_createdByName(self, obj):
        user = obj.created_by
        if not user:
            return ""
        return user.display_name or user.username or user.email

    def validate(self, attrs):
        starts_at = attrs.get("starts_at") or getattr(self.instance, "starts_at", None)
        ends_at = attrs.get("ends_at") or getattr(self.instance, "ends_at", None)
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"endsAt": "The end time must be after the start."})

        request = self.context.get("request")
        user = getattr(request, "user", None)
        course = attrs.get("course", getattr(self.instance, "course", None))

        # A platform-wide event reaches every student on the platform, so only
        # admins may create one. Teachers must name one of their own courses.
        if course is None and getattr(user, "role", None) != "admin":
            raise serializers.ValidationError(
                {"course": "Choose one of your courses. Only admins can schedule for everyone."}
            )

        if course is not None and getattr(user, "role", None) == "teacher":
            teacher_profile = getattr(user, "teacher_profile", None)
            if not teacher_profile or course.teacher_id != teacher_profile.id:
                raise serializers.ValidationError(
                    {"course": "You can only schedule events for courses you teach."}
                )

        return attrs


class StudentEventSerializer(serializers.ModelSerializer):
    """What a student sees — no draft state, no ownership details."""

    courseTitle = serializers.CharField(source="course.title", read_only=True, default="")
    courseId = serializers.UUIDField(source="course.id", read_only=True, default=None)
    startsAt = serializers.DateTimeField(source="starts_at")
    endsAt = serializers.DateTimeField(source="ends_at")
    joinUrl = serializers.URLField(source="join_url")
    isCancelled = serializers.BooleanField(source="is_cancelled")

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "description",
            "kind",
            "startsAt",
            "endsAt",
            "courseId",
            "courseTitle",
            "joinUrl",
            "location",
            "isCancelled",
        )


class TeacherCourseChoiceSerializer(serializers.ModelSerializer):
    """Minimal course list for the "which course?" picker."""

    class Meta:
        model = Course
        fields = ("id", "title")
