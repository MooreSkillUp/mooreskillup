from django.utils import timezone
from rest_framework import permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from common.permissions import IsAdminUserRole, IsTeacherUserRole

from .models import Course, Lesson, Section, Task, TeacherActivityLog
from .serializers import (
    CourseSerializer,
    LessonSerializer,
    SectionSerializer,
    TaskSerializer,
    TeacherActivitySerializer,
)


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Course.objects.filter(status="published", visibility="visible")
        .select_related("teacher__user", "category", "subcategory")
        .prefetch_related("sections__lessons", "sections__tasks", "tags")
    )
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]


class AdminCourseListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        courses = (
            Course.objects.all()
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "tags")
            .order_by("-updated_at", "-created_at")
        )
        return response.Response(CourseSerializer(courses, many=True, context={"request": request}).data)


class TeacherCourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return (
            Course.objects.filter(teacher=self.request.user.teacher_profile)
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "tags")
        )

    def perform_create(self, serializer):
        course = serializer.save(teacher=self.request.user.teacher_profile)
        TeacherActivityLog.objects.create(
            teacher=self.request.user.teacher_profile,
            course=course,
            message=f"Created course {course.title}",
            activity_type="create-course",
        )

    def perform_update(self, serializer):
        course = serializer.save()
        TeacherActivityLog.objects.create(
            teacher=self.request.user.teacher_profile,
            course=course,
            message=f"Updated course {course.title}",
            activity_type="edit-course",
        )

    def perform_destroy(self, instance):
        TeacherActivityLog.objects.create(
            teacher=self.request.user.teacher_profile,
            course=instance,
            message=f"Deleted course {instance.title}",
            activity_type="delete-course",
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.status = "published"
        course.visibility = "visible"
        if not course.published_at:
            course.published_at = timezone.now()
        course.save(update_fields=["status", "visibility", "published_at", "updated_at"])
        TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course=course,
            message=f"Published course {course.title}",
            activity_type="publish-course",
        )
        return response.Response(self.get_serializer(course).data, status=status.HTTP_200_OK)


class TeacherSectionViewSet(viewsets.ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Section.objects.select_related("course").filter(course__teacher=self.request.user.teacher_profile)


class TeacherLessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Lesson.objects.select_related("section__course").filter(
            section__course__teacher=self.request.user.teacher_profile
        )


class TeacherTaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Task.objects.select_related("section__course").filter(
            section__course__teacher=self.request.user.teacher_profile
        )


class TeacherCourseSectionCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, course_id):
        course = Course.objects.get(id=course_id, teacher=request.user.teacher_profile)
        serializer = SectionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherSectionLessonCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = Section.objects.get(id=section_id, course__teacher=request.user.teacher_profile)
        serializer = LessonSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherSectionTaskCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = Section.objects.get(id=section_id, course__teacher=request.user.teacher_profile)
        serializer = TaskSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherCoursePricingView(APIView):
    permission_classes = [IsTeacherUserRole]

    def patch(self, request, course_id):
        course = Course.objects.get(id=course_id, teacher=request.user.teacher_profile)
        serializer = CourseSerializer(course, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class TeacherActivityListView(APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        activities = TeacherActivityLog.objects.filter(teacher=request.user.teacher_profile)[:50]
        return response.Response(TeacherActivitySerializer(activities, many=True).data)

    def post(self, request):
        message = request.data.get("message", "").strip()
        activity_type = request.data.get("type", "").strip()
        if not message or not activity_type:
            return response.Response(
                {"detail": "message and type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        activity = TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course_id=request.data.get("courseId"),
            message=message,
            activity_type=activity_type,
        )
        return response.Response(TeacherActivitySerializer(activity).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        deleted_count, _ = TeacherActivityLog.objects.filter(teacher=request.user.teacher_profile).delete()
        return response.Response({"detail": "Teacher activity history cleared.", "deleted": deleted_count})


class AdminCourseReassignView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, course_id):
        from apps.accounts.models import TeacherProfile

        course = Course.objects.get(id=course_id)
        next_teacher_id = request.data.get("new_teacher_profile_id")
        if next_teacher_id in (None, "", "admin-owned"):
            course.teacher = None
            course.save(update_fields=["teacher", "updated_at"])
            return response.Response({"detail": "Course moved to admin ownership successfully."})

        teacher = TeacherProfile.objects.get(id=next_teacher_id)
        course.teacher = teacher
        course.save(update_fields=["teacher", "updated_at"])
        return response.Response({"detail": "Course reassigned successfully."})
