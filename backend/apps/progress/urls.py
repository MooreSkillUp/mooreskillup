from django.urls import path

from .views import AdminDashboardView, CourseProgressDetailView, LessonProgressUpdateView, StudentDashboardView, TeacherDashboardView

urlpatterns = [
    path("progress/lessons/<uuid:lesson_id>/", LessonProgressUpdateView.as_view(), name="progress-lesson"),
    path("progress/courses/<uuid:course_id>/", CourseProgressDetailView.as_view(), name="progress-course"),
    path("dashboard/student/", StudentDashboardView.as_view(), name="dashboard-student"),
    path("dashboard/teacher/", TeacherDashboardView.as_view(), name="dashboard-teacher"),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
]
