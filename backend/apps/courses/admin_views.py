from django.utils import timezone
from rest_framework import response, status
from rest_framework.views import APIView

from common.permissions import IsAdminUserRole

from .models import Course, Lesson, Section, Task
from .serializers import CourseSerializer, LessonSerializer, SectionSerializer, TaskSerializer


class AdminCourseMixin:
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return Course.objects.select_related("teacher__user", "category", "subcategory").prefetch_related(
            "sections__lessons",
            "sections__tasks",
            "tags",
        )

    def get_course(self, course_id):
        return self.get_queryset().get(id=course_id)


class AdminOwnedCourseMixin(AdminCourseMixin):
    def get_course(self, course_id):
        return self.get_queryset().get(id=course_id, teacher__isnull=True)


class AdminCourseDetailView(AdminCourseMixin, APIView):
    def get(self, request, course_id):
        course = self.get_course(course_id)
        return response.Response(CourseSerializer(course, context={"request": request}).data)

    def patch(self, request, course_id):
        course = self.get_course(course_id)
        serializer = CourseSerializer(course, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class AdminOwnedCourseDetailView(AdminOwnedCourseMixin, APIView):
    def get(self, request, course_id):
        course = self.get_course(course_id)
        return response.Response(CourseSerializer(course, context={"request": request}).data)

    def patch(self, request, course_id):
        course = self.get_course(course_id)
        serializer = CourseSerializer(course, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class AdminOwnedCoursePublishView(AdminOwnedCourseMixin, APIView):
    def post(self, request, course_id):
        course = self.get_course(course_id)
        course.status = "published"
        course.visibility = "visible"
        if not course.published_at:
            course.published_at = timezone.now()
        course.save(update_fields=["status", "visibility", "published_at", "updated_at"])
        return response.Response(CourseSerializer(course, context={"request": request}).data, status=status.HTTP_200_OK)


class AdminOwnedCourseSectionCreateView(AdminOwnedCourseMixin, APIView):
    def post(self, request, course_id):
        course = self.get_course(course_id)
        serializer = SectionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedSectionView(APIView):
    permission_classes = [IsAdminUserRole]

    def get_object(self, section_id):
        return Section.objects.select_related("course").get(id=section_id, course__teacher__isnull=True)

    def patch(self, request, section_id):
        section = self.get_object(section_id)
        serializer = SectionSerializer(section, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    def delete(self, request, section_id):
        section = self.get_object(section_id)
        section.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class AdminOwnedSectionLessonCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, section_id):
        section = Section.objects.get(id=section_id, course__teacher__isnull=True)
        serializer = LessonSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedLessonView(APIView):
    permission_classes = [IsAdminUserRole]

    def get_object(self, lesson_id):
        return Lesson.objects.select_related("section__course").get(id=lesson_id, section__course__teacher__isnull=True)

    def patch(self, request, lesson_id):
        lesson = self.get_object(lesson_id)
        serializer = LessonSerializer(lesson, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    def delete(self, request, lesson_id):
        lesson = self.get_object(lesson_id)
        lesson.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class AdminOwnedSectionTaskCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, section_id):
        section = Section.objects.get(id=section_id, course__teacher__isnull=True)
        serializer = TaskSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedTaskView(APIView):
    permission_classes = [IsAdminUserRole]

    def get_object(self, task_id):
        return Task.objects.select_related("section__course").get(id=task_id, section__course__teacher__isnull=True)

    def patch(self, request, task_id):
        task = self.get_object(task_id)
        serializer = TaskSerializer(task, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    def delete(self, request, task_id):
        task = self.get_object(task_id)
        task.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)
