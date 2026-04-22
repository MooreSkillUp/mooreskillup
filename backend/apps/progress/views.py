from decimal import Decimal

from django.utils import timezone
from rest_framework import response, status, views

from common.permissions import IsAdminUserRole, IsStudentUserRole, IsTeacherUserRole
from apps.courses.models import Course, Lesson
from apps.enrollments.models import Enrollment
from apps.notifications.models import Notification
from apps.payments.models import Payment

from .models import CourseProgress, LessonProgress
from .serializers import CourseProgressSerializer, LessonProgressSerializer


def refresh_course_progress(enrollment: Enrollment):
    total = Lesson.objects.filter(
        section__course=enrollment.course,
        section__is_published=True,
        is_published=True,
    ).count()
    completed = LessonProgress.objects.filter(enrollment=enrollment, status="completed").count()
    percentage = Decimal("0.00")
    if total:
        percentage = (Decimal(completed) / Decimal(total) * Decimal("100")).quantize(Decimal("0.01"))
    progress, _ = CourseProgress.objects.get_or_create(enrollment=enrollment)
    progress.completed_lessons_count = completed
    progress.total_lessons_count = total
    progress.progress_percent = percentage
    progress.is_completed = total > 0 and completed == total
    progress.save()
    if progress.is_completed and enrollment.status != "completed":
        enrollment.status = "completed"
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "completed_at", "updated_at"])
        from apps.certificates.models import Certificate

        Certificate.objects.get_or_create(
            student=enrollment.student,
            course=enrollment.course,
            enrollment=enrollment,
            defaults={
                "certificate_code": f"MSU-{str(enrollment.course.id).split('-')[0].upper()}-{str(enrollment.student.id).split('-')[0].upper()}",
                "verification_url": "",
            },
        )
    return progress


class LessonProgressUpdateView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, lesson_id):
        lesson = Lesson.objects.select_related("section__course").get(id=lesson_id)
        enrollment = Enrollment.objects.get(student=request.user.student_profile, course=lesson.section.course)
        progress, _ = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults={"first_accessed_at": timezone.now(), "last_accessed_at": timezone.now()},
        )
        next_status = request.data.get("status", "in_progress")
        progress.status = next_status
        progress.last_accessed_at = timezone.now()
        if next_status == "completed":
            progress.completed_at = timezone.now()
        if not progress.first_accessed_at:
            progress.first_accessed_at = timezone.now()
        progress.save()
        enrollment.last_lesson = lesson
        enrollment.last_accessed_at = timezone.now()
        enrollment.save(update_fields=["last_lesson", "last_accessed_at", "updated_at"])
        refresh_course_progress(enrollment)
        return response.Response(LessonProgressSerializer(progress).data, status=status.HTTP_200_OK)


class CourseProgressDetailView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request, course_id):
        enrollment = Enrollment.objects.get(student=request.user.student_profile, course_id=course_id)
        progress = refresh_course_progress(enrollment)
        return response.Response(CourseProgressSerializer(progress).data)


class StudentDashboardView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        student = request.user.student_profile
        enrollments = (
            Enrollment.objects.filter(student=student)
            .select_related("course", "last_lesson")
            .order_by("-last_accessed_at", "-created_at")
        )
        continue_enrollment = enrollments.filter(last_lesson__isnull=False).first() or enrollments.first()
        recent_courses = [
            {
                "id": str(enrollment.course.id),
                "title": enrollment.course.title,
                "subtitle": enrollment.course.subtitle,
                "price": str(enrollment.course.price),
            }
            for enrollment in enrollments[:3]
        ]
        recommended_queryset = Course.objects.filter(status="published", visibility="visible").exclude(
            id__in=enrollments.values_list("course_id", flat=True)
        )[:4]
        recommended = [
            {
                "id": str(course.id),
                "title": course.title,
                "subtitle": course.subtitle,
                "price": str(course.price),
            }
            for course in recommended_queryset
        ]
        notifications = list(
            Notification.objects.filter(user=request.user).order_by("-created_at")[:3].values(
                "id", "title", "body", "kind", "created_at"
            )
        )

        return response.Response(
            {
                "user": {
                    "id": str(request.user.id),
                    "displayName": request.user.display_name,
                    "email": request.user.email,
                    "avatar": request.user.avatar,
                    "selectedInterest": student.selected_interest,
                    "selectedTrack": student.selected_track,
                },
                "continueLearning": {
                    "courseId": str(continue_enrollment.course.id),
                    "courseTitle": continue_enrollment.course.title,
                    "lessonId": str(continue_enrollment.last_lesson.id) if continue_enrollment and continue_enrollment.last_lesson else None,
                }
                if continue_enrollment
                else None,
                "recentCourses": recent_courses,
                "recommendedCourses": recommended,
                "notifications": notifications,
            }
        )


class TeacherDashboardView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        teacher = request.user.teacher_profile
        courses = Course.objects.filter(teacher=teacher)
        return response.Response(
            {
                "teacher": {
                    "id": str(teacher.id),
                    "displayName": request.user.display_name,
                    "email": request.user.email,
                    "program": teacher.program,
                    "track": teacher.track,
                },
                "stats": {
                    "totalCourses": courses.count(),
                    "publishedCourses": courses.filter(status="published").count(),
                    "draftCourses": courses.filter(status="draft").count(),
                    "activeCourses": courses.filter(status="published", visibility="visible").count(),
                },
            }
        )


class AdminDashboardView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        return response.Response(
            {
                "totals": {
                    "users": request.user.__class__.objects.count(),
                    "teachers": request.user.__class__.objects.filter(role="teacher").count(),
                    "students": request.user.__class__.objects.filter(role="student").count(),
                    "courses": Course.objects.count(),
                    "payments": Payment.objects.filter(status="successful").count(),
                    "revenue": str(
                        sum(Payment.objects.filter(status="successful").values_list("amount", flat=True), start=Decimal("0.00"))
                    ),
                }
            }
        )
