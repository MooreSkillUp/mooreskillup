from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    MembershipViewSet,
    StructureExportView,
    TeamMemberBankDetailsView,
    TeamMemberViewSet,
)

router = DefaultRouter()
router.register("admin/departments", DepartmentViewSet, basename="admin-departments")
router.register("admin/team-members", TeamMemberViewSet, basename="admin-team-members")
router.register("admin/department-memberships", MembershipViewSet, basename="admin-memberships")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "admin/team-members/<uuid:member_id>/bank-details/",
        TeamMemberBankDetailsView.as_view(),
        name="admin-team-member-bank-details",
    ),
    path("admin/organization/export/", StructureExportView.as_view(), name="admin-structure-export"),
]
