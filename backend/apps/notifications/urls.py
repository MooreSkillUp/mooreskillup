from django.urls import path

from .views import BroadcastCreateView, NotificationListView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("admin/broadcasts/", BroadcastCreateView.as_view(), name="admin-broadcasts"),
]
