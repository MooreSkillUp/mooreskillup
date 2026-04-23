from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCourseListView,
    AdminCourseReassignView,
    CourseViewSet,
    TeacherCoursePricingView,
    TeacherCourseSectionCreateView,
    TeacherCourseViewSet,
    TeacherActivityListView,
    TeacherLessonViewSet,
    TeacherSectionLessonCreateView,
    TeacherSectionTaskCreateView,
    TeacherSectionViewSet,
    TeacherTaskViewSet,
)

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("teacher/courses", TeacherCourseViewSet, basename="teacher-course")
router.register("teacher/sections", TeacherSectionViewSet, basename="teacher-section")
router.register("teacher/lessons", TeacherLessonViewSet, basename="teacher-lesson")
router.register("teacher/tasks", TeacherTaskViewSet, basename="teacher-task")

urlpatterns = [
    path("admin/courses/", AdminCourseListView.as_view(), name="admin-courses-list"),
    path("teacher/courses/<uuid:course_id>/sections/", TeacherCourseSectionCreateView.as_view(), name="teacher-course-sections-create"),
    path("teacher/sections/<uuid:section_id>/lessons/", TeacherSectionLessonCreateView.as_view(), name="teacher-section-lessons-create"),
    path("teacher/sections/<uuid:section_id>/tasks/", TeacherSectionTaskCreateView.as_view(), name="teacher-section-tasks-create"),
    path("teacher/courses/<uuid:course_id>/pricing/", TeacherCoursePricingView.as_view(), name="teacher-course-pricing"),
    path("teacher/activities/", TeacherActivityListView.as_view(), name="teacher-activities"),
    path("admin/courses/<uuid:course_id>/reassign/", AdminCourseReassignView.as_view(), name="admin-course-reassign"),
]

urlpatterns += router.urls
