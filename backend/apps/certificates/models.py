from django.core.cache import cache
from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

TEMPLATE_CACHE_KEY = "certificate-template"


class Certificate(UUIDPrimaryKeyModel, TimeStampedModel):
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="certificates")
    enrollment = models.OneToOneField("enrollments.Enrollment", on_delete=models.CASCADE, related_name="certificate")
    certificate_code = models.CharField(max_length=255, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to="certificates/", blank=True)
    verification_url = models.URLField(blank=True)
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return self.certificate_code


class CertificateTemplate(models.Model):
    """Single-row config that styles every issued certificate (MSU-owned)."""

    institution_name = models.CharField(max_length=120, default="MooreSkillUp")
    signatory_name = models.CharField(max_length=120, default="MooreSkillUp Team")
    signatory_title = models.CharField(max_length=120, default="Director of Learning")
    accent_color = models.CharField(max_length=20, default="#4f46e5")
    # Rendered in a cursive font as the signature — no image upload needed.
    signature_text = models.CharField(max_length=120, default="MooreSkillUp")
    seal_text = models.CharField(max_length=120, default="MooreSkillUp · Verified")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Certificate template"
        verbose_name_plural = "Certificate template"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete(TEMPLATE_CACHE_KEY)

    @classmethod
    def get_solo(cls):
        cached = cache.get(TEMPLATE_CACHE_KEY)
        if cached is not None:
            return cached
        instance, _ = cls.objects.get_or_create(pk=1)
        cache.set(TEMPLATE_CACHE_KEY, instance, 60)
        return instance

    def __str__(self):
        return self.institution_name
