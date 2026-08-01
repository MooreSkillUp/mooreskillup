from django.urls import path

from .views import (
    AdminCourseChoicesView,
    AdminEventDetailView,
    AdminEventListCreateView,
    StudentScheduleView,
    StudentUpcomingView,
    TeacherCourseChoicesView,
    TeacherEventDetailView,
    TeacherEventListCreateView,
)

urlpatterns = [
    # Student
    path("student/upcoming/", StudentUpcomingView.as_view(), name="student-upcoming"),
    path("student/schedule/", StudentScheduleView.as_view(), name="student-schedule"),
    # Teacher
    path("teacher/events/", TeacherEventListCreateView.as_view(), name="teacher-events"),
    path("teacher/events/<uuid:event_id>/", TeacherEventDetailView.as_view(), name="teacher-event"),
    path(
        "teacher/event-courses/", TeacherCourseChoicesView.as_view(), name="teacher-event-courses"
    ),
    # Admin
    path("admin/events/", AdminEventListCreateView.as_view(), name="admin-events"),
    path("admin/events/<uuid:event_id>/", AdminEventDetailView.as_view(), name="admin-event"),
    path("admin/event-courses/", AdminCourseChoicesView.as_view(), name="admin-event-courses"),
]
