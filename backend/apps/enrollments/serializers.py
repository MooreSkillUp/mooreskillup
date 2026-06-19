from rest_framework import serializers

from apps.courses.serializers import CourseSerializer

from .models import Enrollment, Watchlist


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    progressPercent = serializers.SerializerMethodField()
    lastLessonId = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "course",
            "access_source",
            "status",
            "enrolled_at",
            "completed_at",
            "last_accessed_at",
            "last_lesson",
            "lastLessonId",
            "progressPercent",
        )

    def get_progressPercent(self, obj):
        progress = getattr(obj, "course_progress", None)
        return float(progress.progress_percent) if progress else 0.0

    def get_lastLessonId(self, obj):
        return str(obj.last_lesson_id) if obj.last_lesson_id else None


class WatchlistSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Watchlist
        fields = ("id", "course", "course_id", "created_at")
