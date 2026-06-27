import csv
from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import response, views
from rest_framework.pagination import PageNumberPagination

from common.rbac import AdminActionsPerMethod

from .audit import record_audit

from .models import AuditLog, AuthenticationSettings, PlatformSettings
from .serializers import AuditLogSerializer, AuthenticationSettingsSerializer, PlatformSettingsSerializer


def prune_expired_logs():
    """Delete logs older than the configured retention window."""
    retention_days = PlatformSettings.get_solo().audit_retention_days
    cutoff = timezone.now() - timedelta(days=retention_days)
    AuditLog.objects.filter(created_at__lt=cutoff).delete()


def filtered_logs(request):
    queryset = AuditLog.objects.all()
    action = request.query_params.get("action", "").strip()
    actor = request.query_params.get("actor", "").strip()
    resource_type = request.query_params.get("resourceType", "").strip()
    search = request.query_params.get("search", "").strip()
    date_from = request.query_params.get("from", "").strip()
    date_to = request.query_params.get("to", "").strip()

    if action:
        queryset = queryset.filter(action=action)
    if actor:
        queryset = queryset.filter(actor_email__icontains=actor)
    if resource_type:
        queryset = queryset.filter(resource_type=resource_type)
    if search:
        from django.db.models import Q

        queryset = queryset.filter(
            Q(action__icontains=search)
            | Q(actor_email__icontains=search)
            | Q(actor_name__icontains=search)
            | Q(resource_name__icontains=search)
        )
    if date_from:
        queryset = queryset.filter(created_at__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__date__lte=date_to)
    return queryset


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "pageSize"
    max_page_size = 100


class AdminAuditLogListView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("activity-logs:view",)}

    def get(self, request):
        prune_expired_logs()
        queryset = filtered_logs(request)
        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


class AdminAuditLogExportView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("activity-logs:export",)}

    def get(self, request):
        prune_expired_logs()
        queryset = filtered_logs(request)[:10000]
        http_response = HttpResponse(content_type="text/csv")
        http_response["Content-Disposition"] = 'attachment; filename="audit-logs.csv"'
        writer = csv.writer(http_response)
        writer.writerow(
            ["Timestamp", "Actor", "Email", "Role", "Action", "Resource type", "Resource", "Status", "IP"]
        )
        for log in queryset:
            writer.writerow(
                [
                    log.created_at.isoformat(),
                    log.actor_name,
                    log.actor_email,
                    log.actor_role,
                    log.action,
                    log.resource_type,
                    log.resource_name,
                    log.status,
                    log.ip_address or "",
                ]
            )
        record_audit(request, "audit-logs.export", resource_type="logs")
        return http_response


class PlatformSettingsView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("admin-settings:view",), "PATCH": ("admin-settings:edit",)}

    def get(self, request):
        return response.Response(PlatformSettingsSerializer(PlatformSettings.get_solo()).data)

    def patch(self, request):
        instance = PlatformSettings.get_solo()
        before = PlatformSettingsSerializer(instance).data
        serializer = PlatformSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        after = serializer.data
        changes = {
            key: {"before": before.get(key), "after": after.get(key)}
            for key in after
            if key != "updatedAt" and before.get(key) != after.get(key)
        }
        record_audit(request, "settings.update", resource_type="settings", changes=changes)
        return response.Response(after)


class AuthenticationSettingsView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("permissions:manage",), "PATCH": ("permissions:manage",)}

    def get(self, request):
        return response.Response(AuthenticationSettingsSerializer(AuthenticationSettings.get_solo()).data)

    def patch(self, request):
        instance = AuthenticationSettings.get_solo()
        serializer = AuthenticationSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(request, "auth-settings.update", resource_type="settings")
        return response.Response(serializer.data)


class PublicPlatformStatusView(views.APIView):
    """Lightweight unauthenticated status: lets the frontend show a maintenance banner."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        settings_row = PlatformSettings.get_solo()
        return response.Response(
            {
                "siteName": settings_row.site_name,
                "maintenanceMode": settings_row.maintenance_mode,
                "maintenanceMessage": settings_row.maintenance_message,
                "studentRegistrationOpen": settings_row.student_registration_open,
                "features": {
                    "reviews": settings_row.feature_reviews_enabled,
                    "certificates": settings_row.feature_certificates_enabled,
                    "recommendations": settings_row.feature_recommendations_enabled,
                    "achievements": settings_row.feature_achievements_enabled,
                    "leaderboard": settings_row.feature_leaderboard_enabled,
                    "quiz": settings_row.feature_quiz_enabled,
                },
            }
        )
