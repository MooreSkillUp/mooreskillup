from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Certificate(UUIDPrimaryKeyModel, TimeStampedModel):
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="certificates")
    enrollment = models.OneToOneField("enrollments.Enrollment", on_delete=models.CASCADE, related_name="certificate")
    certificate_code = models.CharField(max_length=255, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to="certificates/", blank=True)
    verification_url = models.URLField(blank=True)

    class Meta:
        unique_together = ("student", "course")
