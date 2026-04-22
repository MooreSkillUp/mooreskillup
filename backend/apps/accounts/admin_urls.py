from django.urls import path

from .views import AdminTeacherListView, AdminTeacherUpdateView

urlpatterns = [
    path("admin/teachers/", AdminTeacherListView.as_view(), name="admin-teachers"),
    path("admin/teachers/<uuid:teacher_id>/", AdminTeacherUpdateView.as_view(), name="admin-teacher-update"),
]
