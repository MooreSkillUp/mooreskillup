from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class EnrollmentQuerySet(models.QuerySet):
    def with_access(self):
        """Enrolments that still open the course.

        A refund marks the enrolment "revoked" rather than deleting it, so the
        student's progress survives a later repurchase. Every check that asked
        only whether an enrolment existed kept handing the refunded course over.
        """
        return self.exclude(status="revoked")


class Enrollment(UUIDPrimaryKeyModel, TimeStampedModel):
    ACCESS_CHOICES = (
        ("free", "Free"),
        ("payment", "Payment"),
        ("admin_grant", "Admin grant"),
        # A campaign that took the price to nothing. Recorded as its own source
        # so a 100% promotion is not mistaken for a course that was always free.
        ("campaign", "Campaign"),
    )
    STATUS_CHOICES = (("active", "Active"), ("completed", "Completed"), ("revoked", "Revoked"))

    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="enrollments")
    access_source = models.CharField(max_length=20, choices=ACCESS_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    last_lesson = models.ForeignKey("courses.Lesson", null=True, blank=True, on_delete=models.SET_NULL)

    objects = EnrollmentQuerySet.as_manager()

    class Meta:
        unique_together = ("student", "course")


class Watchlist(UUIDPrimaryKeyModel, TimeStampedModel):
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="watchlist_entries")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="watchlisted_by")

    class Meta:
        unique_together = ("student", "course")
