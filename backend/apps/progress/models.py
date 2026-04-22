from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class LessonProgress(UUIDPrimaryKeyModel, TimeStampedModel):
    STATUS_CHOICES = (("not_started", "Not started"), ("in_progress", "In progress"), ("completed", "Completed"))

    enrollment = models.ForeignKey("enrollments.Enrollment", on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.CASCADE, related_name="lesson_progress")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")
    first_accessed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("enrollment", "lesson")


class CourseProgress(UUIDPrimaryKeyModel, TimeStampedModel):
    enrollment = models.OneToOneField("enrollments.Enrollment", on_delete=models.CASCADE, related_name="course_progress")
    completed_lessons_count = models.PositiveIntegerField(default=0)
    total_lessons_count = models.PositiveIntegerField(default=0)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)
