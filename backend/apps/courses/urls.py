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
from .admin_views import (
    AdminCourseDetailView,
    AdminOwnedCourseDetailView,
    AdminOwnedCoursePublishView,
    AdminOwnedCourseSectionCreateView,
    AdminOwnedLessonView,
    AdminOwnedSectionLessonCreateView,
    AdminOwnedSectionTaskCreateView,
    AdminOwnedSectionView,
    AdminOwnedTaskView,
)

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("teacher/courses", TeacherCourseViewSet, basename="teacher-course")
router.register("teacher/sections", TeacherSectionViewSet, basename="teacher-section")
router.register("teacher/lessons", TeacherLessonViewSet, basename="teacher-lesson")
router.register("teacher/tasks", TeacherTaskViewSet, basename="teacher-task")

urlpatterns = [
    path("admin/courses/", AdminCourseListView.as_view(), name="admin-courses-list"),
    path("admin/course-catalog/<uuid:course_id>/", AdminCourseDetailView.as_view(), name="admin-course-detail"),
    path("admin/courses/<uuid:course_id>/", AdminOwnedCourseDetailView.as_view(), name="admin-owned-course-detail"),
    path("admin/courses/<uuid:course_id>/publish/", AdminOwnedCoursePublishView.as_view(), name="admin-owned-course-publish"),
    path("admin/courses/<uuid:course_id>/sections/", AdminOwnedCourseSectionCreateView.as_view(), name="admin-owned-course-sections-create"),
    path("admin/sections/<uuid:section_id>/", AdminOwnedSectionView.as_view(), name="admin-owned-section-detail"),
    path("admin/sections/<uuid:section_id>/lessons/", AdminOwnedSectionLessonCreateView.as_view(), name="admin-owned-section-lessons-create"),
    path("admin/sections/<uuid:section_id>/tasks/", AdminOwnedSectionTaskCreateView.as_view(), name="admin-owned-section-tasks-create"),
    path("admin/lessons/<uuid:lesson_id>/", AdminOwnedLessonView.as_view(), name="admin-owned-lesson-detail"),
    path("admin/tasks/<uuid:task_id>/", AdminOwnedTaskView.as_view(), name="admin-owned-task-detail"),
    path("teacher/courses/<uuid:course_id>/sections/", TeacherCourseSectionCreateView.as_view(), name="teacher-course-sections-create"),
    path("teacher/sections/<uuid:section_id>/lessons/", TeacherSectionLessonCreateView.as_view(), name="teacher-section-lessons-create"),
    path("teacher/sections/<uuid:section_id>/tasks/", TeacherSectionTaskCreateView.as_view(), name="teacher-section-tasks-create"),
    path("teacher/courses/<uuid:course_id>/pricing/", TeacherCoursePricingView.as_view(), name="teacher-course-pricing"),
    path("teacher/activities/", TeacherActivityListView.as_view(), name="teacher-activities"),
    path("admin/courses/<uuid:course_id>/reassign/", AdminCourseReassignView.as_view(), name="admin-course-reassign"),
]

urlpatterns += router.urls
