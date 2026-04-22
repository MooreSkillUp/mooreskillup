import secrets

from rest_framework import response, status, views

from common.permissions import IsStudentUserRole
from apps.enrollments.models import Enrollment

from .models import Certificate
from .serializers import CertificateSerializer


class CertificateListView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        certificates = Certificate.objects.filter(student=request.user.student_profile).select_related("course")
        return response.Response(CertificateSerializer(certificates, many=True).data)


class CertificateGenerateView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, course_id):
        enrollment = Enrollment.objects.select_related("course").get(student=request.user.student_profile, course_id=course_id)
        if enrollment.status != "completed":
            return response.Response({"detail": "Course is not completed yet."}, status=status.HTTP_400_BAD_REQUEST)
        certificate, _ = Certificate.objects.get_or_create(
            student=request.user.student_profile,
            course=enrollment.course,
            enrollment=enrollment,
            defaults={"certificate_code": f"MSU-{secrets.token_hex(6).upper()}"},
        )
        return response.Response(CertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)
