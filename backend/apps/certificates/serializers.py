from rest_framework import serializers

from .models import Certificate, CertificateTemplate


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    courseTitle = serializers.CharField(source="course.title", read_only=True)
    studentName = serializers.CharField(source="student.user.display_name", read_only=True)
    certificateCode = serializers.CharField(source="certificate_code", read_only=True)
    issuedAt = serializers.DateTimeField(source="issued_at", read_only=True)
    verificationUrl = serializers.URLField(source="verification_url", read_only=True)
    isRevoked = serializers.BooleanField(source="is_revoked", read_only=True)

    class Meta:
        model = Certificate
        fields = (
            "id",
            "course",
            "course_title",
            "courseTitle",
            "studentName",
            "certificate_code",
            "certificateCode",
            "issued_at",
            "issuedAt",
            "verification_url",
            "verificationUrl",
            "isRevoked",
            "pdf_file",
        )


class CertificateTemplateSerializer(serializers.ModelSerializer):
    institutionName = serializers.CharField(source="institution_name", required=False)
    signatoryName = serializers.CharField(source="signatory_name", required=False)
    signatoryTitle = serializers.CharField(source="signatory_title", required=False)
    accentColor = serializers.CharField(source="accent_color", required=False)
    signatureText = serializers.CharField(source="signature_text", required=False)
    sealText = serializers.CharField(source="seal_text", required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CertificateTemplate
        fields = (
            "institutionName",
            "signatoryName",
            "signatoryTitle",
            "accentColor",
            "signatureText",
            "sealText",
            "updatedAt",
        )
