from django.urls import path

from .views import BroadcastCreateView, NotificationListView, NotificationMarkAllReadView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notifications-mark-all-read"),
    path("admin/broadcasts/", BroadcastCreateView.as_view(), name="admin-broadcasts"),
]
