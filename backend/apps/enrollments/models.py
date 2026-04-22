from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Enrollment(UUIDPrimaryKeyModel, TimeStampedModel):
    ACCESS_CHOICES = (("free", "Free"), ("payment", "Payment"), ("admin_grant", "Admin grant"))
    STATUS_CHOICES = (("active", "Active"), ("completed", "Completed"), ("revoked", "Revoked"))

    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="enrollments")
    access_source = models.CharField(max_length=20, choices=ACCESS_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    last_lesson = models.ForeignKey("courses.Lesson", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        unique_together = ("student", "course")


class Watchlist(UUIDPrimaryKeyModel, TimeStampedModel):
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="watchlist_entries")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="watchlisted_by")

    class Meta:
        unique_together = ("student", "course")
