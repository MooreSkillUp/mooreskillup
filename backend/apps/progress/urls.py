from django.urls import path

from .views import (
    AdminDashboardView,
    CourseProgressDetailView,
    LessonNoteView,
    LessonProgressUpdateView,
    StudentDashboardView,
    TeacherAnalyticsExportView,
    TeacherAnalyticsView,
    TeacherDashboardView,
    TeacherStudentsExportView,
    TeacherStudentsView,
)

urlpatterns = [
    path("progress/lessons/<uuid:lesson_id>/", LessonProgressUpdateView.as_view(), name="progress-lesson"),
    path("lessons/<uuid:lesson_id>/note/", LessonNoteView.as_view(), name="lesson-note"),
    path("progress/courses/<uuid:course_id>/", CourseProgressDetailView.as_view(), name="progress-course"),
    path("dashboard/student/", StudentDashboardView.as_view(), name="dashboard-student"),
    path("dashboard/teacher/", TeacherDashboardView.as_view(), name="dashboard-teacher"),
    path("teacher/analytics/", TeacherAnalyticsView.as_view(), name="teacher-analytics"),
    path("teacher/analytics/export/", TeacherAnalyticsExportView.as_view(), name="teacher-analytics-export"),
    path("teacher/students/", TeacherStudentsView.as_view(), name="teacher-students"),
    path("teacher/students/export/", TeacherStudentsExportView.as_view(), name="teacher-students-export"),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
]
