from rest_framework import serializers

from apps.courses.serializers import CourseSerializer

from .models import Enrollment, Watchlist


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)

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
        )


class WatchlistSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Watchlist
        fields = ("id", "course", "course_id", "created_at")
