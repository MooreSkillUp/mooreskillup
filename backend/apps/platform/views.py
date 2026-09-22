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

PRUNE_THROTTLE_KEY = "audit-logs-pruned-recently"
PRUNE_EVERY_SECONDS = 24 * 60 * 60


def prune_expired_logs():
    """Delete logs older than the retention window. Returns how many went."""
    retention_days = PlatformSettings.get_solo().audit_retention_days
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted, _ = AuditLog.objects.filter(created_at__lt=cutoff).delete()
    return deleted


def prune_expired_logs_daily():
    """Enforce retention at most once a day, not on every request.

    This ran on every list and every export, so each page load issued a DELETE
    across the table. Worse, lowering the retention number destroyed everything
    past the new window the moment the next admin opened the page, with nothing
    said — the Settings page now says how many entries a shorter window throws
    away, and asks, before saving it.
    """
    from django.core.cache import cache

    if cache.get(PRUNE_THROTTLE_KEY):
        return 0
    cache.set(PRUNE_THROTTLE_KEY, True, PRUNE_EVERY_SECONDS)
    return prune_expired_logs()


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

    # "How much would a shorter retention window throw away?" — asked by the
    # Settings page before saving a smaller number, so the count it warns with
    # is the real one rather than an estimate.
    to_days_ago = request.query_params.get("to_days_ago", "").strip()
    if to_days_ago.isdigit():
        queryset = queryset.filter(created_at__lt=timezone.now() - timedelta(days=int(to_days_ago)))
    return queryset


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "pageSize"
    max_page_size = 100


class AdminAuditLogListView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("activity-logs:view",)}

    def get(self, request):
        # A `to_days_ago` request is the Settings page asking what a shorter
        # window would throw away. Asking the question must not answer it by
        # deleting the evidence first.
        if not request.query_params.get("to_days_ago"):
            prune_expired_logs_daily()
        queryset = filtered_logs(request)
        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


class AdminAuditLogExportView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"GET": ("activity-logs:export",)}

    def get(self, request):
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
                "signInEnabled": settings_row.sign_in_enabled,
                # The documents live on this platform; the form only needs to
                # know which exist yet, so it never links to an empty page.
                "legal": _legal_summary(),
                # Everything the pre-launch screen needs, for a visitor who has
                # no account and cannot be asked to sign in first.
                "launch": {
                    "state": settings_row.launch_state,
                    "countdownEnabled": settings_row.countdown_enabled,
                    "launchAt": (
                        settings_row.launch_at.isoformat() if settings_row.launch_at else None
                    ),
                    "headline": settings_row.launch_headline,
                    "message": settings_row.launch_message,
                    "ctaLabel": settings_row.launch_cta_label,
                    "ctaUrl": settings_row.launch_cta_url,
                    "communityUrl": settings_row.community_url,
                    "communityLabel": settings_row.community_label,
                },
                # Said before someone tries: a Buy button that fails on click
                # is worse than one that explains itself.
                "paymentsEnabled": settings_row.payments_enabled,
                "supportResponseHours": settings_row.support_response_hours,
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



def _legal_summary():
    from .models import LegalDocument, current_legal_version

    published = {
        document.kind
        for document in LegalDocument.objects.all()
        if document.is_published
    }
    return {
        "version": current_legal_version(),
        "termsUrl": "/legal/terms",
        "privacyUrl": "/legal/privacy",
        "refundUrl": "/legal/refund",
        "termsPublished": "terms" in published,
        "privacyPublished": "privacy" in published,
        "refundPublished": "refund" in published,
    }


class PublicLegalDocumentView(views.APIView):
    """A legal document, for anyone. Nothing here is private by design."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, kind):
        from .models import LegalDocument
        from .serializers import LegalDocumentSerializer

        if kind not in dict(LegalDocument.KINDS):
            return response.Response({"detail": "No such document."}, status=404)
        document = LegalDocument.for_kind(kind)
        data = LegalDocumentSerializer(document).data
        # Unpublished drafts are not shown to the public, only their absence.
        if not document.is_published:
            data["body"] = ""
        data.pop("updatedByName", None)
        return response.Response(data)


class AdminLegalDocumentView(AdminActionsPerMethod, views.APIView):
    """Write and publish the legal documents.

    A Super Admin edits the text here. Publishing a changed body bumps the
    version, so acceptances recorded from then on say which text they were.
    Saving the same text again changes nothing, and bumps nothing.
    """

    admin_actions = {"GET": ("admin-settings:view",), "PUT": ("admin-settings:edit",)}

    def get(self, request, kind=None):
        from .models import LegalDocument
        from .serializers import LegalDocumentSerializer

        documents = [LegalDocument.for_kind(k) for k, _ in LegalDocument.KINDS]
        return response.Response(LegalDocumentSerializer(documents, many=True).data)

    def put(self, request, kind=None):
        from django.utils import timezone

        from .models import LegalDocument
        from .serializers import LegalDocumentSerializer

        if kind not in dict(LegalDocument.KINDS):
            return response.Response({"detail": "No such document."}, status=404)
        document = LegalDocument.for_kind(kind)
        serializer = LegalDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data["title"].strip() or document.title
        body = serializer.validated_data["body"]
        changed = body.strip() != document.body.strip() or title != document.title

        if changed:
            before = document.version
            document.title = title
            document.body = body
            document.version += 1
            document.published_at = timezone.now()
            document.updated_by = request.user
            document.save()
            record_audit(
                request,
                "settings.update",
                resource_type="settings",
                resource_id=document.id,
                resource_name=document.title,
                changes={"version": {"before": before, "after": document.version}},
            )
        return response.Response(LegalDocumentSerializer(document).data)
