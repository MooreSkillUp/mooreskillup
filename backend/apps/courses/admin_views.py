from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import response, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from common.rbac import AdminActionsPerMethod, user_has_admin_permission
from apps.platform.audit import record_audit

from .models import Course, Lesson, Project, Section, Task
from .serializers import (
    CourseSerializer,
    LessonSerializer,
    ProjectSerializer,
    SectionSerializer,
    TaskSerializer,
)

# Editing content (sections/lessons/tasks) inside an admin-owned course is part
# of "courses:edit"; "courses:delete" is reserved for removing whole courses.
OWNED_CONTENT_ACTIONS = {
    "GET": ("courses:view",),
    "POST": ("courses:edit",),
    "PATCH": ("courses:edit",),
    "DELETE": ("courses:edit",),
}


def _require_managed_course_access(request, course, *, write=False):
    if course.teacher_id is None:
        return
    if write or request.method not in ("GET", "HEAD", "OPTIONS"):
        if not user_has_admin_permission(request.user, "courses:edit"):
            raise PermissionDenied("You do not have permission to edit this course.")
    elif not user_has_admin_permission(request.user, "courses:view"):
        raise PermissionDenied("You do not have permission to view this course.")


class AdminCourseMixin(AdminActionsPerMethod):
    admin_actions = {"GET": ("courses:view",), "PATCH": ("courses:edit",)}

    def get_queryset(self):
        return Course.objects.select_related("teacher__user", "category", "subcategory").prefetch_related(
            "sections__lessons",
            "sections__tasks",
            "sections__projects",
            "tags",
        )

    def get_course(self, course_id):
        return get_object_or_404(self.get_queryset(), id=course_id)


class AdminOwnedCourseMixin(AdminCourseMixin):
    def get_course(self, course_id):
        course = get_object_or_404(self.get_queryset(), id=course_id)
        _require_managed_course_access(self.request, course, write=self.request.method not in ("GET", "HEAD", "OPTIONS"))
        return course


class AdminOwnedOnlyCourseMixin(AdminCourseMixin):
    def get_course(self, course_id):
        return get_object_or_404(self.get_queryset(), id=course_id, teacher__isnull=True)


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


class AdminOwnedCoursePublishView(AdminOwnedOnlyCourseMixin, APIView):
    admin_actions = {"POST": ("courses:publish",)}

    def post(self, request, course_id):
        course = self.get_course(course_id)
        course.status = "published"
        course.visibility = "visible"
        if not course.published_at:
            course.published_at = timezone.now()
        course.save(update_fields=["status", "visibility", "published_at", "updated_at"])
        record_audit(
            request,
            "course.publish",
            resource_type="course",
            resource_id=course.id,
            resource_name=course.title,
        )
        return response.Response(CourseSerializer(course, context={"request": request}).data, status=status.HTTP_200_OK)


class AdminOwnedCourseSectionCreateView(AdminOwnedCourseMixin, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def post(self, request, course_id):
        course = self.get_course(course_id)
        serializer = SectionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedSectionView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def get_object(self, section_id):
        section = get_object_or_404(Section.objects.select_related("course"), id=section_id)
        _require_managed_course_access(
            self.request,
            section.course,
            write=self.request.method not in ("GET", "HEAD", "OPTIONS"),
        )
        return section

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


class AdminOwnedSectionLessonCreateView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def post(self, request, section_id):
        section = get_object_or_404(Section.objects.select_related("course"), id=section_id)
        _require_managed_course_access(self.request, section.course, write=True)
        serializer = LessonSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedLessonView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def get_object(self, lesson_id):
        lesson = get_object_or_404(Lesson.objects.select_related("section__course"), id=lesson_id)
        _require_managed_course_access(
            self.request,
            lesson.section.course,
            write=self.request.method not in ("GET", "HEAD", "OPTIONS"),
        )
        return lesson

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


class AdminOwnedSectionTaskCreateView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def post(self, request, section_id):
        section = get_object_or_404(Section.objects.select_related("course"), id=section_id)
        _require_managed_course_access(self.request, section.course, write=True)
        serializer = TaskSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedTaskView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def get_object(self, task_id):
        task = get_object_or_404(Task.objects.select_related("section__course"), id=task_id)
        _require_managed_course_access(
            self.request,
            task.section.course,
            write=self.request.method not in ("GET", "HEAD", "OPTIONS"),
        )
        return task

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


class AdminOwnedSectionProjectCreateView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def post(self, request, section_id):
        section = get_object_or_404(Section.objects.select_related("course"), id=section_id)
        _require_managed_course_access(self.request, section.course, write=True)
        serializer = ProjectSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminOwnedProjectView(AdminActionsPerMethod, APIView):
    admin_actions = OWNED_CONTENT_ACTIONS

    def get_object(self, project_id):
        project = get_object_or_404(Project.objects.select_related("section__course"), id=project_id)
        _require_managed_course_access(
            self.request,
            project.section.course,
            write=self.request.method not in ("GET", "HEAD", "OPTIONS"),
        )
        return project

    def patch(self, request, project_id):
        project = self.get_object(project_id)
        serializer = ProjectSerializer(project, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    def delete(self, request, project_id):
        project = self.get_object(project_id)
        project.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)
