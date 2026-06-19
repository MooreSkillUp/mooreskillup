from django.urls import path

from .views import (
    AdminSupportTicketDetailView,
    AdminSupportTicketListView,
    BroadcastCreateView,
    BroadcastDetailView,
    NotificationClearView,
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllReadView,
    StudentSupportTicketListView,
    TeacherAnnouncementView,
    TeacherSupportTicketListView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notifications-mark-all-read"),
    path("notifications/clear/", NotificationClearView.as_view(), name="notifications-clear"),
    path("notifications/<uuid:notification_id>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("admin/broadcasts/", BroadcastCreateView.as_view(), name="admin-broadcasts"),
    path("admin/broadcasts/<uuid:broadcast_id>/", BroadcastDetailView.as_view(), name="admin-broadcast-detail"),
    path("admin/support-tickets/", AdminSupportTicketListView.as_view(), name="admin-support-tickets"),
    path("admin/support-tickets/<uuid:ticket_id>/", AdminSupportTicketDetailView.as_view(), name="admin-support-ticket-detail"),
    path("teacher/support-tickets/", TeacherSupportTicketListView.as_view(), name="teacher-support-tickets"),
    path("student/support-tickets/", StudentSupportTicketListView.as_view(), name="student-support-tickets"),
    path("teacher/announcements/", TeacherAnnouncementView.as_view(), name="teacher-announcements"),
]
