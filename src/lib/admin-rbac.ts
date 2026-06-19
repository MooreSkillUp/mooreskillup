/**
 * Role-Based Access Control (RBAC) System for Admin Panel
 * Implements hierarchical role system with permission matrix
 *
 * IMPORTANT — two layers, don't confuse them:
 *
 * 1. `rolePermissionMap` is the DEFAULT permission set per tier. It mirrors
 *    backend/common/rbac.py's PERMISSION_MATRIX and is used ONLY for display
 *    purposes — e.g. showing what a moderator gets "out of the box" in the
 *    admin permission-editor UI.
 *
 * 2. The user's ACTUAL effective permissions (defaults + per-user grant/revoke
 *    overrides, exactly as computed by backend `get_permissions_for()`) are
 *    sent from the API on every `AuthUser` as `user.permissions: string[]`.
 *    ALL real access checks in pages/components MUST use `hasUserPermission()`
 *    or `hasAnyUserPermission()` below, which read from `user.permissions`.
 *    Checking `hasPermission(role, action)` instead would ignore overrides
 *    and silently show/hide the wrong thing for any admin with a custom grant
 *    or revoke.
 */

export type AdminRole = "super-admin" | "admin" | "moderator";

export type AdminResourceAction =
  | "dashboard:view"
  | "dashboard:refresh"
  | "admins:view"
  | "admins:create"
  | "admins:edit"
  | "admins:change-role"
  | "admins:deactivate"
  | "admins:delete"
  | "teachers:view"
  | "teachers:create"
  | "teachers:edit"
  | "teachers:delete"
  | "students:view"
  | "students:edit"
  | "students:delete"
  | "students:suspend"
  | "students:bulk-suspend"
  | "courses:view"
  | "courses:create"
  | "courses:edit"
  | "courses:delete"
  | "courses:approve"
  | "courses:decline"
  | "courses:reassign"
  | "courses:archive"
  | "courses:restore"
  | "courses:publish"
  | "courses:unpublish"
  | "categories:view"
  | "categories:create"
  | "categories:edit"
  | "categories:delete"
  | "users:view"
  | "users:edit"
  | "users:delete"
  | "users:role-management"
  | "notifications:view"
  | "notifications:create"
  | "notifications:broadcast"
  | "notifications:schedule"
  | "payments:view"
  | "payments:refund"
  | "analytics:view"
  | "analytics:export"
  | "support:view"
  | "support:assign"
  | "support:close"
  | "support:add-notes"
  | "reviews:view"
  | "reviews:moderate"
  | "activity-logs:view"
  | "activity-logs:export"
  | "admin-settings:view"
  | "admin-settings:edit"
  | "audit-logs:view"
  | "audit-logs:export"
  | "permissions:manage";

export interface AdminPermission {
  action: AdminResourceAction;
  description: string;
  resourceType: "dashboard" | "teacher" | "student" | "course" | "user" | "notification" | "payment" | "analytics" | "support" | "review" | "logs" | "settings";
}

export type RolePermissionMap = {
  [key in AdminRole]: AdminResourceAction[];
};

// ── Default permission set per tier (DISPLAY ONLY — see header note) ──────────
// Kept in 1:1 sync with backend/common/rbac.py PERMISSION_MATRIX.
export const rolePermissionMap: RolePermissionMap = {
  "super-admin": [
    "dashboard:view",
    "dashboard:refresh",
    "admins:view",
    "admins:create",
    "admins:edit",
    "admins:change-role",
    "admins:deactivate",
    "admins:delete",
    "teachers:view",
    "teachers:create",
    "teachers:edit",
    "teachers:delete",
    "students:view",
    "students:edit",
    "students:delete",
    "students:suspend",
    "students:bulk-suspend",
    "courses:view",
    "courses:create",
    "courses:edit",
    "courses:delete",
    "courses:approve",
    "courses:decline",
    "courses:reassign",
    "courses:archive",
    "courses:restore",
    "courses:publish",
    "courses:unpublish",
    "categories:view",
    "categories:create",
    "categories:edit",
    "categories:delete",
    "users:view",
    "users:edit",
    "users:delete",
    "users:role-management",
    "notifications:view",
    "notifications:create",
    "notifications:broadcast",
    "notifications:schedule",
    "payments:view",
    "payments:refund",
    "analytics:view",
    "analytics:export",
    "support:view",
    "support:assign",
    "support:close",
    "support:add-notes",
    "reviews:view",
    "reviews:moderate",
    "activity-logs:view",
    "activity-logs:export",
    "admin-settings:view",
    "admin-settings:edit",
    "audit-logs:view",
    "audit-logs:export",
    "permissions:manage",
  ],
  admin: [
    "dashboard:view",
    "dashboard:refresh",
    "teachers:view",
    "teachers:create",
    "teachers:edit",
    "students:view",
    "students:edit",
    "students:suspend",
    "courses:view",
    "courses:create",
    "courses:edit",
    "courses:approve",
    "courses:decline",
    "courses:reassign",
    "courses:archive",
    "courses:restore",
    "courses:publish",
    "courses:unpublish",
    "courses:delete",
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
    "support:view",
    "support:assign",
    "support:close",
    "support:add-notes",
    "reviews:view",
    "reviews:moderate",
    "activity-logs:view",
    "admin-settings:view",
  ],
  moderator: [
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
  ],
};

// List of all permissions for reference (used by permission-editor UI)
export const allPermissions: AdminPermission[] = [
  { action: "dashboard:view", description: "View admin dashboard", resourceType: "dashboard" },
  { action: "dashboard:refresh", description: "Refresh dashboard data", resourceType: "dashboard" },
  { action: "admins:view", description: "View admin team members", resourceType: "settings" },
  { action: "admins:create", description: "Create new admin accounts", resourceType: "settings" },
  { action: "admins:edit", description: "Edit admin accounts", resourceType: "settings" },
  { action: "admins:change-role", description: "Change an admin's tier", resourceType: "settings" },
  { action: "admins:deactivate", description: "Deactivate an admin account", resourceType: "settings" },
  { action: "admins:delete", description: "Permanently delete an admin account", resourceType: "settings" },
  { action: "teachers:view", description: "View teachers list", resourceType: "teacher" },
  { action: "teachers:create", description: "Create new teacher", resourceType: "teacher" },
  { action: "teachers:edit", description: "Edit teacher information", resourceType: "teacher" },
  { action: "teachers:delete", description: "Delete teacher", resourceType: "teacher" },
  { action: "students:view", description: "View students list", resourceType: "student" },
  { action: "students:edit", description: "Edit student information", resourceType: "student" },
  { action: "students:delete", description: "Delete student", resourceType: "student" },
  { action: "students:suspend", description: "Suspend student account", resourceType: "student" },
  { action: "students:bulk-suspend", description: "Bulk suspend students", resourceType: "student" },
  { action: "courses:view", description: "View courses", resourceType: "course" },
  { action: "courses:create", description: "Create new course", resourceType: "course" },
  { action: "courses:edit", description: "Edit course", resourceType: "course" },
  { action: "courses:delete", description: "Delete course", resourceType: "course" },
  { action: "courses:approve", description: "Approve course submission", resourceType: "course" },
  { action: "courses:decline", description: "Decline course submission", resourceType: "course" },
  { action: "courses:reassign", description: "Reassign course to another teacher", resourceType: "course" },
  { action: "courses:archive", description: "Archive course", resourceType: "course" },
  { action: "courses:restore", description: "Restore archived course", resourceType: "course" },
  { action: "courses:publish", description: "Publish course", resourceType: "course" },
  { action: "courses:unpublish", description: "Unpublish course", resourceType: "course" },
  { action: "categories:view", description: "View categories", resourceType: "course" },
  { action: "categories:create", description: "Create category", resourceType: "course" },
  { action: "categories:edit", description: "Edit category", resourceType: "course" },
  { action: "categories:delete", description: "Delete category", resourceType: "course" },
  { action: "users:view", description: "View any user account", resourceType: "user" },
  { action: "users:edit", description: "Edit any user account", resourceType: "user" },
  { action: "users:delete", description: "Delete any user account", resourceType: "user" },
  { action: "users:role-management", description: "Change a user's role", resourceType: "user" },
  { action: "notifications:view", description: "View notifications", resourceType: "notification" },
  { action: "notifications:create", description: "Create notification", resourceType: "notification" },
  { action: "notifications:broadcast", description: "Broadcast notification to users", resourceType: "notification" },
  { action: "notifications:schedule", description: "Schedule notifications", resourceType: "notification" },
  { action: "payments:view", description: "View payment information", resourceType: "payment" },
  { action: "payments:refund", description: "Process refunds", resourceType: "payment" },
  { action: "analytics:view", description: "View analytics", resourceType: "analytics" },
  { action: "analytics:export", description: "Export analytics data", resourceType: "analytics" },
  { action: "support:view", description: "View support tickets", resourceType: "support" },
  { action: "support:assign", description: "Assign support tickets", resourceType: "support" },
  { action: "support:close", description: "Close support tickets", resourceType: "support" },
  { action: "support:add-notes", description: "Add notes to support tickets", resourceType: "support" },
  { action: "reviews:view", description: "View course reviews", resourceType: "review" },
  { action: "reviews:moderate", description: "Moderate/remove course reviews", resourceType: "review" },
  { action: "activity-logs:view", description: "View activity logs", resourceType: "logs" },
  { action: "activity-logs:export", description: "Export activity logs", resourceType: "logs" },
  { action: "admin-settings:view", description: "View admin settings", resourceType: "settings" },
  { action: "admin-settings:edit", description: "Edit admin settings", resourceType: "settings" },
  { action: "audit-logs:view", description: "View audit logs", resourceType: "logs" },
  { action: "audit-logs:export", description: "Export audit logs", resourceType: "logs" },
  { action: "permissions:manage", description: "Manage permissions and roles", resourceType: "settings" },
];

// ── DISPLAY-ONLY checks against the default role map ──────────────────────────
// Use these ONLY in the permission-editor UI when showing tier defaults.
// Do NOT use these to gate real pages/buttons — see hasUserPermission below.

export function hasPermission(
  userRole: AdminRole | undefined,
  action: AdminResourceAction
): boolean {
  if (!userRole) return false;
  const permissions = rolePermissionMap[userRole] ?? [];
  return permissions.includes(action);
}

export function hasAnyPermission(
  userRole: AdminRole | undefined,
  actions: AdminResourceAction[]
): boolean {
  if (!userRole) return false;
  return actions.some((action) => hasPermission(userRole, action));
}

export function hasAllPermissions(
  userRole: AdminRole | undefined,
  actions: AdminResourceAction[]
): boolean {
  if (!userRole) return false;
  return actions.every((action) => hasPermission(userRole, action));
}

// ── LIVE checks against the user's actual effective permissions ───────────────
// Use these everywhere real access control matters: page guards, buttons,
// conditional rendering. `permissions` should be `user.permissions` from
// useAuth(), which the backend already computed with overrides applied.

export function hasUserPermission(
  permissions: string[] | undefined,
  action: AdminResourceAction
): boolean {
  if (!permissions || !permissions.length) return false;
  return permissions.includes(action);
}

export function hasAnyUserPermission(
  permissions: string[] | undefined,
  actions: AdminResourceAction[]
): boolean {
  if (!permissions || !permissions.length) return false;
  return actions.some((action) => permissions.includes(action));
}

export function hasAllUserPermissions(
  permissions: string[] | undefined,
  actions: AdminResourceAction[]
): boolean {
  if (!permissions || !permissions.length) return false;
  return actions.every((action) => permissions.includes(action));
}

// ── Role hierarchy (for "can this admin manage that admin" checks) ────────────

export function getRoleHierarchy(role: AdminRole): number {
  const hierarchy: Record<AdminRole, number> = {
    "super-admin": 3,
    admin: 2,
    moderator: 1,
  };
  return hierarchy[role] ?? 0;
}

export function canManageRole(
  actingRole: AdminRole | undefined,
  targetRole: AdminRole
): boolean {
  if (!actingRole) return false;
  return getRoleHierarchy(actingRole) > getRoleHierarchy(targetRole);
}