from rest_framework import serializers

from .models import CourseProgress, LessonNote, LessonProgress


class CourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProgress
        fields = ("completed_lessons_count", "total_lessons_count", "progress_percent", "is_completed", "updated_at")


class LessonProgressSerializer(serializers.ModelSerializer):
    course_progress = serializers.SerializerMethodField()
    lastPositionSeconds = serializers.IntegerField(source="last_position_seconds", read_only=True)

    class Meta:
        model = LessonProgress
        fields = (
            "lesson",
            "status",
            "completed_at",
            "last_accessed_at",
            "lastPositionSeconds",
            "course_progress",
        )

    def get_course_progress(self, obj):
        if hasattr(obj.enrollment, "course_progress"):
            return CourseProgressSerializer(obj.enrollment.course_progress).data
        return None


class LessonNoteSerializer(serializers.ModelSerializer):
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = LessonNote
        fields = ("id", "lesson", "content", "updatedAt")
        read_only_fields = ("lesson",)
