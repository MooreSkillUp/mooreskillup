from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCourseApproveView,
    AdminCourseArchiveView,
    AdminCourseDeclineView,
    AdminCourseDeleteApproveView,
    AdminCourseDeleteRejectView,
    AdminCourseListView,
    AdminCourseReassignView,
    AdminCourseRestoreView,
    AdminReviewModerateView,
    CourseReviewListCreateView,
    CourseViewSet,
    RecommendedCoursesView,
    StudentLessonView,
    TeacherCoursePricingView,
    TeacherCourseSectionCreateView,
    TeacherCourseViewSet,
    TeacherActivityListView,
    TeacherLessonViewSet,
    TeacherProjectViewSet,
    TeacherSectionLessonCreateView,
    TeacherSectionProjectCreateView,
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
    AdminOwnedProjectView,
    AdminOwnedSectionLessonCreateView,
    AdminOwnedSectionProjectCreateView,
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
router.register("teacher/projects", TeacherProjectViewSet, basename="teacher-project")

urlpatterns = [
    path("courses/recommended/", RecommendedCoursesView.as_view(), name="courses-recommended"),
    path("student/lessons/<uuid:lesson_id>/", StudentLessonView.as_view(), name="student-lesson"),
    path("courses/<uuid:course_id>/reviews/", CourseReviewListCreateView.as_view(), name="course-reviews"),
    path("admin/reviews/", AdminReviewModerateView.as_view(), name="admin-reviews"),
    path("admin/reviews/<uuid:review_id>/", AdminReviewModerateView.as_view(), name="admin-review-moderate"),
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
    path("admin/sections/<uuid:section_id>/projects/", AdminOwnedSectionProjectCreateView.as_view(), name="admin-owned-section-projects-create"),
    path("admin/projects/<uuid:project_id>/", AdminOwnedProjectView.as_view(), name="admin-owned-project-detail"),
    path("teacher/courses/<uuid:course_id>/sections/", TeacherCourseSectionCreateView.as_view(), name="teacher-course-sections-create"),
    path("teacher/sections/<uuid:section_id>/lessons/", TeacherSectionLessonCreateView.as_view(), name="teacher-section-lessons-create"),
    path("teacher/sections/<uuid:section_id>/tasks/", TeacherSectionTaskCreateView.as_view(), name="teacher-section-tasks-create"),
    path("teacher/sections/<uuid:section_id>/projects/", TeacherSectionProjectCreateView.as_view(), name="teacher-section-projects-create"),
    path("teacher/courses/<uuid:course_id>/pricing/", TeacherCoursePricingView.as_view(), name="teacher-course-pricing"),
    path("teacher/activities/", TeacherActivityListView.as_view(), name="teacher-activities"),
    path("admin/courses/<uuid:course_id>/reassign/", AdminCourseReassignView.as_view(), name="admin-course-reassign"),
    path("admin/courses/<uuid:course_id>/approve/", AdminCourseApproveView.as_view(), name="admin-course-approve"),
    path("admin/courses/<uuid:course_id>/decline/", AdminCourseDeclineView.as_view(), name="admin-course-decline"),
    path("admin/courses/<uuid:course_id>/archive/", AdminCourseArchiveView.as_view(), name="admin-course-archive"),
    path("admin/courses/<uuid:course_id>/restore/", AdminCourseRestoreView.as_view(), name="admin-course-restore"),
    path("admin/courses/<uuid:course_id>/delete/", AdminCourseDeleteApproveView.as_view(), name="admin-course-delete"),
    path("admin/courses/<uuid:course_id>/abort-deletion/", AdminCourseDeleteRejectView.as_view(), name="admin-course-abort-deletion"),
]

urlpatterns += router.urls
