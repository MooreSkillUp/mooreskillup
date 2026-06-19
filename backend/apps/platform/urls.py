from django.urls import path

from .views import (
    AdminAuditLogExportView,
    AdminAuditLogListView,
    PlatformSettingsView,
    PublicPlatformStatusView,
)

urlpatterns = [
    path("admin/audit-logs/", AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("admin/audit-logs/export/", AdminAuditLogExportView.as_view(), name="admin-audit-logs-export"),
    path("admin/settings/", PlatformSettingsView.as_view(), name="admin-settings"),
    path("platform/status/", PublicPlatformStatusView.as_view(), name="platform-status"),
]
