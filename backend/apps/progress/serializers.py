from rest_framework import serializers

from .models import CourseProgress, LessonProgress


class CourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProgress
        fields = ("completed_lessons_count", "total_lessons_count", "progress_percent", "is_completed", "updated_at")


class LessonProgressSerializer(serializers.ModelSerializer):
    course_progress = serializers.SerializerMethodField()

    class Meta:
        model = LessonProgress
        fields = ("lesson", "status", "completed_at", "last_accessed_at", "course_progress")

    def get_course_progress(self, obj):
        if hasattr(obj.enrollment, "course_progress"):
            return CourseProgressSerializer(obj.enrollment.course_progress).data
        return None
