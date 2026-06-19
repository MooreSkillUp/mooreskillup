from django.shortcuts import get_object_or_404
from rest_framework import permissions, response, status, views
from rest_framework.generics import ListAPIView

from common.permissions import IsStudentUserRole
from apps.courses.models import Course

from .models import Enrollment, Watchlist
from .serializers import EnrollmentSerializer, WatchlistSerializer


class MyCoursesView(ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsStudentUserRole]
    pagination_class = None  # the student's library is small; return all

    def get_queryset(self):
        return (
            Enrollment.objects.filter(student=self.request.user.student_profile)
            .select_related(
                "course__teacher__user", "course__category", "course__subcategory",
                "last_lesson", "course_progress",
            )
            .order_by("-last_accessed_at", "-created_at")
        )


class EnrollFreeView(views.APIView):
    """Enroll in a free course with one click. Paid courses must go through checkout."""

    permission_classes = [IsStudentUserRole]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id, status="published", visibility="visible")
        student = request.user.student_profile

        existing = Enrollment.objects.filter(student=student, course=course).first()
        if existing:
            return response.Response(EnrollmentSerializer(existing, context={"request": request}).data)
        if course.price and course.price > 0:
            return response.Response(
                {"detail": "This is a paid course. Please complete checkout to enroll."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        enrollment = Enrollment.objects.create(
            student=student, course=course, access_source="free", status="active"
        )

        from common.email import frontend_url, send_transactional_email

        send_transactional_email(
            to_email=request.user.email,
            subject=f"You're enrolled — {course.title}",
            heading="Welcome to your new course 🎓",
            greeting=f"Hi {request.user.display_name},",
            intro=f"You're now enrolled in {course.title}. Jump in whenever you're ready — your progress saves automatically.",
            button_label="Start learning",
            button_url=frontend_url(f"/course/{course.id}"),
        )
        return response.Response(
            EnrollmentSerializer(enrollment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class WatchlistView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        queryset = Watchlist.objects.filter(student=request.user.student_profile).select_related(
            "course__teacher__user", "course__category", "course__subcategory"
        )
        return response.Response(WatchlistSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        course = Course.objects.get(id=request.data["course_id"])
        entry, _ = Watchlist.objects.get_or_create(student=request.user.student_profile, course=course)
        return response.Response(WatchlistSerializer(entry, context={"request": request}).data, status=status.HTTP_201_CREATED)


class WatchlistDeleteView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def delete(self, request, course_id):
        Watchlist.objects.filter(student=request.user.student_profile, course_id=course_id).delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)
