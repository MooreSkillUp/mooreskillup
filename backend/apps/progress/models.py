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
    # Resume point for video lessons (seconds into the video).
    last_position_seconds = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("enrollment", "lesson")


class CourseProgress(UUIDPrimaryKeyModel, TimeStampedModel):
    enrollment = models.OneToOneField("enrollments.Enrollment", on_delete=models.CASCADE, related_name="course_progress")
    completed_lessons_count = models.PositiveIntegerField(default=0)
    total_lessons_count = models.PositiveIntegerField(default=0)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)


class LessonNote(UUIDPrimaryKeyModel, TimeStampedModel):
    """One free-text note per student per lesson."""

    enrollment = models.ForeignKey("enrollments.Enrollment", on_delete=models.CASCADE, related_name="lesson_notes")
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.CASCADE, related_name="notes")
    content = models.TextField(blank=True)

    class Meta:
        unique_together = ("enrollment", "lesson")


class DailyActivity(UUIDPrimaryKeyModel, TimeStampedModel):
    """One row per student per day of learning.

    LessonProgress records time against a *lesson*, which cannot answer "did
    this student study yesterday" without scanning every enrolment. This can,
    cheaply — it is what the streak, the daily goal and the weekly bars all read.

    It is also the table Phase 7's XP system will build on, which is why it
    stores counts rather than a single opaque score.

    Note this can only ever describe activity from the day it shipped. There is
    no way to reconstruct history, so every student starts at zero.
    """

    student = models.ForeignKey(
        "accounts.StudentProfile", on_delete=models.CASCADE, related_name="daily_activity"
    )
    date = models.DateField()
    # Seconds is the stored truth and minutes is derived from it. Accumulating
    # seconds as they are credited keeps a day final once it has passed —
    # recomputing from LessonProgress would not, because `last_accessed_at`
    # moves every time a student reopens an old lesson, which would quietly
    # rewrite history.
    seconds = models.PositiveIntegerField(default=0)
    minutes = models.PositiveIntegerField(default=0)
    lessons_completed = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("student", "date")
        ordering = ("-date",)
        indexes = [models.Index(fields=["student", "-date"])]

    def __str__(self):
        return f"{self.student_id} on {self.date}"
