from django.urls import path

from .views import (
    AdminAccountDetailView,
    AdminAccountListView,
    AdminAccountResendCredentialsView,
    AdminAmbassadorDetailView,
    AdminAmbassadorListView,
    AdminPermissionOverrideView,
    AdminStudentGrantAccessView,
    AdminStudentListView,
    AdminStudentUpdateView,
    AdminTeacherListView,
    AdminTeacherResendInviteView,
    AdminTeacherUpdateView,
)

urlpatterns = [
    path("admin/admins/", AdminAccountListView.as_view(), name="admin-admins"),
    path("admin/admins/<uuid:admin_id>/", AdminAccountDetailView.as_view(), name="admin-admin-update"),
    path(
        "admin/admins/<uuid:admin_id>/resend-credentials/",
        AdminAccountResendCredentialsView.as_view(),
        name="admin-admin-resend",
    ),
    path(
        "admin/admins/<uuid:admin_id>/permissions/",
        AdminPermissionOverrideView.as_view(),
        name="admin-admin-permissions",
    ),
    path("admin/teachers/", AdminTeacherListView.as_view(), name="admin-teachers"),
    path("admin/teachers/<uuid:teacher_id>/", AdminTeacherUpdateView.as_view(), name="admin-teacher-update"),
    path(
        "admin/teachers/<uuid:teacher_id>/resend-invite/",
        AdminTeacherResendInviteView.as_view(),
        name="admin-teacher-resend",
    ),
    path("admin/ambassadors/", AdminAmbassadorListView.as_view(), name="admin-ambassadors"),
    path(
        "admin/ambassadors/<uuid:ambassador_id>/",
        AdminAmbassadorDetailView.as_view(),
        name="admin-ambassador-detail",
    ),
    path("admin/students/", AdminStudentListView.as_view(), name="admin-students"),
    path("admin/students/<uuid:student_id>/", AdminStudentUpdateView.as_view(), name="admin-student-update"),
    path(
        "admin/students/<uuid:student_id>/grant-access/",
        AdminStudentGrantAccessView.as_view(),
        name="admin-student-grant-access",
    ),
]
