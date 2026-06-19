"""Tiered admin RBAC.

Single source of truth for admin permissions. The frontend mirror lives in
src/lib/admin-rbac.ts and must stay in sync with PERMISSION_MATRIX below.

Tiers (User.admin_role, only meaningful when User.role == "admin"):
  - super_admin: platform owner; everything, including managing other admins.
  - admin: day-to-day operations; no admin management, settings edits, deletes,
    refunds, or audit export.
  - moderator: course review, support triage, review moderation only.
"""

from rest_framework.permissions import BasePermission

SUPER_ADMIN = "super_admin"
ADMIN = "admin"
MODERATOR = "moderator"

ADMIN_ROLE_CHOICES = (
    (SUPER_ADMIN, "Super Admin"),
    (ADMIN, "Admin"),
    (MODERATOR, "Moderator"),
)

ADMIN_ROLE_LABELS = dict(ADMIN_ROLE_CHOICES)

_MODERATOR_PERMISSIONS = frozenset(
    {
        "dashboard:view",
        "courses:view",
        "courses:approve",
        "courses:decline",
        "courses:archive",
        "support:view",
        "support:add-notes",
        "reviews:view",
        "reviews:moderate",
        "activity-logs:view",
    }
)

_ADMIN_PERMISSIONS = _MODERATOR_PERMISSIONS | frozenset(
    {
        "dashboard:refresh",
        "teachers:view",
        "teachers:create",
        "teachers:edit",
        "students:view",
        "students:edit",
        "students:suspend",
        "courses:create",
        "courses:edit",
        "courses:reassign",
        "courses:restore",
        "courses:publish",
        "courses:unpublish",
        "categories:view",
        "categories:create",
        "categories:edit",
        "users:view",
        "users:edit",
        "notifications:view",
        "notifications:create",
        "notifications:broadcast",
        "notifications:schedule",
        "payments:view",
        "analytics:view",
        "analytics:export",
        "support:assign",
        "support:close",
        "admin-settings:view",
        # Admins are the approvers for teacher course-deletion requests, so they
        # can delete courses; teachers cannot (they must request it).
        "courses:delete",
    }
)

_SUPER_ADMIN_PERMISSIONS = _ADMIN_PERMISSIONS | frozenset(
    {
        "admins:view",
        "admins:create",
        "admins:edit",
        "admins:change-role",
        "admins:deactivate",
        "admins:delete",
        "teachers:delete",
        "students:delete",
        "students:bulk-suspend",
        "courses:delete",
        "categories:delete",
        "users:delete",
        "users:role-management",
        "payments:refund",
        "activity-logs:export",
        "admin-settings:edit",
        "audit-logs:view",
        "audit-logs:export",
        "permissions:manage",
    }
)

PERMISSION_MATRIX = {
    SUPER_ADMIN: _SUPER_ADMIN_PERMISSIONS,
    ADMIN: _ADMIN_PERMISSIONS,
    MODERATOR: _MODERATOR_PERMISSIONS,
}


def get_admin_role(user):
    """Return the effective admin tier for a user, or None."""
    if not user or not user.is_authenticated or user.role != "admin":
        return None
    # Admins created before tiers existed are treated as super admins; the
    # data migration backfills them, this guards anything that slips through.
    return user.admin_role or SUPER_ADMIN


def get_permissions_for(user):
    role = get_admin_role(user)
    if role is None:
        return frozenset()
    base = PERMISSION_MATRIX.get(role, frozenset())
    overrides = getattr(user, "permission_overrides", None) or {}
    if not overrides:
        return base
    granted = set(base) | set(overrides.get("grant", []))
    granted -= set(overrides.get("revoke", []))
    # A super admin can never lose admin-management/permission control — that
    # would let them lock themselves and everyone else out.
    if role == SUPER_ADMIN:
        granted |= {"admins:view", "admins:edit", "permissions:manage"}
    return frozenset(granted)


def user_has_admin_permission(user, action):
    return action in get_permissions_for(user)


def AdminAction(*actions):
    """Build a DRF permission class requiring all of the given admin actions.

    Usage: permission_classes = [AdminAction("courses:approve")]
    """

    unknown = set(actions) - _SUPER_ADMIN_PERMISSIONS
    if unknown:
        raise ValueError(f"Unknown admin action(s): {sorted(unknown)}")

    class _AdminActionPermission(BasePermission):
        message = "You do not have permission to perform this action."
        required_actions = actions

        def has_permission(self, request, view):
            if not (request.user and request.user.is_authenticated and request.user.is_active):
                return False
            granted = get_permissions_for(request.user)
            return all(action in granted for action in actions)

    _AdminActionPermission.__name__ = f"AdminAction({', '.join(actions)})"
    return _AdminActionPermission


class AdminActionsPerViewSetAction:
    """ViewSet mixin mapping DRF actions (list/create/update/destroy) to admin actions.

    Usage:
        class AdminCategoryViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
            admin_actions = {
                "list": ("categories:view",),
                "retrieve": ("categories:view",),
                "create": ("categories:create",),
                "update": ("categories:edit",),
                "partial_update": ("categories:edit",),
                "destroy": ("categories:delete",),
            }
    """

    admin_actions = {}

    def get_permissions(self):
        actions = self.admin_actions.get(getattr(self, "action", None))
        if actions is None:
            actions = ("permissions:manage",)
        return [AdminAction(*actions)()]


class AdminActionsPerMethod:
    """View mixin mapping HTTP methods to required admin actions.

    Usage:
        class AdminTeacherListView(AdminActionsPerMethod, APIView):
            admin_actions = {"GET": ("teachers:view",), "POST": ("teachers:create",)}
    """

    admin_actions = {}

    def get_permissions(self):
        actions = self.admin_actions.get(self.request.method)
        if actions is None:
            # Deny by default: every method on an admin view must be declared.
            actions = ("permissions:manage",)
        return [AdminAction(*actions)()]