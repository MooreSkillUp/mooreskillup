from django.utils import timezone
from rest_framework import response, status, views

from common.permissions import IsStudentUserRole
from common.rbac import AdminAction
from apps.enrollments.models import Enrollment

from .models import Certificate, CertificateTemplate
from .serializers import CertificateSerializer, CertificateTemplateSerializer


class CertificateListView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        certificates = (
            Certificate.objects.filter(student=request.user.student_profile)
            .select_related("course", "student__user")
        )
        return response.Response(CertificateSerializer(certificates, many=True).data)


class CertificateGenerateView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, course_id):
        from apps.progress.views import issue_certificate

        enrollment = Enrollment.objects.select_related("course").get(
            student=request.user.student_profile, course_id=course_id
        )
        if enrollment.status != "completed":
            return response.Response(
                {"detail": "Course is not completed yet."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not enrollment.course.certificate_enabled:
            return response.Response(
                {"detail": "This course does not offer a certificate."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        certificate = issue_certificate(enrollment)
        return response.Response(CertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)


class CertificateVerifyView(views.APIView):
    """Public endpoint: anyone can verify a certificate code."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, code):
        certificate = (
            Certificate.objects.select_related("course", "student__user")
            .filter(certificate_code__iexact=code)
            .first()
        )
        if not certificate or certificate.is_revoked:
            return response.Response({"valid": False})
        return response.Response(
            {
                "valid": True,
                "certificateCode": certificate.certificate_code,
                "studentName": certificate.student.user.display_name,
                "courseTitle": certificate.course.title,
                "issuedAt": certificate.issued_at.isoformat(),
                "institution": CertificateTemplate.get_solo().institution_name,
            }
        )


class PublicCertificateTemplateView(views.APIView):
    """Public read of the template so students can render their certificate."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return response.Response(CertificateTemplateSerializer(CertificateTemplate.get_solo()).data)


class AdminCertificateTemplateView(views.APIView):
    def get_permissions(self):
        if self.request.method == "PATCH":
            return [AdminAction("admin-settings:edit")()]
        return [AdminAction("admin-settings:view")()]

    def get(self, request):
        return response.Response(CertificateTemplateSerializer(CertificateTemplate.get_solo()).data)

    def patch(self, request):
        from apps.platform.audit import record_audit

        template = CertificateTemplate.get_solo()
        serializer = CertificateTemplateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(request, "settings.update", resource_type="settings", metadata={"area": "certificate-template"})
        return response.Response(serializer.data)


class AdminCertificateListView(views.APIView):
    permission_classes = [AdminAction("analytics:view")]

    def get(self, request):
        certificates = Certificate.objects.select_related("course", "student__user").order_by("-issued_at")
        return response.Response(CertificateSerializer(certificates, many=True).data)


class AdminCertificateRevokeView(views.APIView):
    permission_classes = [AdminAction("permissions:manage")]

    def post(self, request, certificate_id):
        from apps.platform.audit import record_audit

        certificate = Certificate.objects.filter(id=certificate_id).first()
        if not certificate:
            return response.Response({"detail": "Certificate not found."}, status=status.HTTP_404_NOT_FOUND)
        revoke = request.data.get("revoke", True)
        certificate.is_revoked = bool(revoke)
        certificate.revoked_at = timezone.now() if revoke else None
        certificate.save(update_fields=["is_revoked", "revoked_at", "updated_at"])
        record_audit(
            request,
            "certificate.revoke" if revoke else "certificate.restore",
            resource_type="certificate",
            resource_id=certificate.id,
            resource_name=certificate.certificate_code,
        )
        return response.Response(CertificateSerializer(certificate).data)
