"""Helper for recording admin actions to the permanent audit trail."""

import logging

from common.rbac import get_admin_role

from .models import AuditLog

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit(
    request,
    action,
    *,
    resource_type="",
    resource_id="",
    resource_name="",
    metadata=None,
    changes=None,
    status="success",
):
    """Write one audit entry. Never raises: auditing must not break the action itself."""
    try:
        user = getattr(request, "user", None)
        AuditLog.objects.create(
            actor=user if getattr(user, "is_authenticated", False) else None,
            actor_email=getattr(user, "email", "") or "",
            actor_name=getattr(user, "display_name", "") or "",
            actor_role=get_admin_role(user) or getattr(user, "role", "") or "",
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id or ""),
            resource_name=str(resource_name or "")[:255],
            metadata=metadata or {},
            changes=changes or {},
            status=status,
            ip_address=_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") or "")[:255],
        )
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to record audit log for action %s", action)
