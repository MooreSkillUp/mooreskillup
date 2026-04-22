from django.utils import timezone
from rest_framework import permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from common.permissions import IsAdminUserRole, IsTeacherUserRole

from .models import Course, Lesson, Section, Task
from .serializers import CourseSerializer, LessonSerializer, SectionSerializer, TaskSerializer


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Course.objects.filter(status="published", visibility="visible")
        .select_related("teacher__user", "category", "subcategory")
        .prefetch_related("sections__lessons", "sections__tasks", "tags")
    )
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]


class TeacherCourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return (
            Course.objects.filter(teacher=self.request.user.teacher_profile)
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "tags")
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.status = "published"
        course.visibility = "visible"
        if not course.published_at:
            course.published_at = timezone.now()
        course.save(update_fields=["status", "visibility", "published_at", "updated_at"])
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


class AdminCourseReassignView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, course_id):
        from apps.accounts.models import TeacherProfile

        course = Course.objects.get(id=course_id)
        teacher = TeacherProfile.objects.get(id=request.data["new_teacher_profile_id"])
        course.teacher = teacher
        course.save(update_fields=["teacher", "updated_at"])
        return response.Response({"detail": "Course reassigned successfully."})
