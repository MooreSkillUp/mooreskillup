/**
 * Audit Logging System
 * Tracks all admin actions with complete audit trail
 */

export type AuditActionType =
  | "teacher.create"
  | "teacher.update"
  | "teacher.delete"
  | "student.create"
  | "student.update"
  | "student.delete"
  | "student.suspend"
  | "student.activate"
  | "course.create"
  | "course.update"
  | "course.delete"
  | "course.approve"
  | "course.decline"
  | "course.publish"
  | "course.unpublish"
  | "course.archive"
  | "course.restore"
  | "course.reassign"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "notification.create"
  | "notification.broadcast"
  | "notification.schedule"
  | "notification.delete"
  | "support.create"
  | "support.assign"
  | "support.update"
  | "support.close"
  | "support.note"
  | "payment.refund"
  | "user.role-change"
  | "user.permission-change"
  | "settings.update"
  | "system.alert"
  | "bulk-operation.start"
  | "bulk-operation.complete";

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  actorEmail: string;
  action: AuditActionType;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failed";
  errorMessage?: string;
}

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  actorId?: string;
  action?: AuditActionType;
  resourceType?: string;
  resourceId?: string;
  status?: "success" | "failed";
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  successfulActions: number;
  failedActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  mostActiveAdmin: string;
  mostModifiedResource: string;
}

const auditLogs: AuditLog[] = [];

export function createAuditLog(
  actorId: string,
  actorRole: string,
  actorEmail: string,
  action: AuditActionType,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  metadata: Record<string, unknown> = {},
  changes: Record<string, { before: unknown; after: unknown }> = {},
  status: "success" | "failed" = "success",
  errorMessage?: string
): AuditLog {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    actorId,
    actorRole,
    actorEmail,
    action,
    resourceType,
    resourceId,
    resourceName,
    changes,
    metadata,
    status,
    errorMessage,
  };

  auditLogs.push(log);

  // Persist to backend in real implementation
  void persistAuditLog(log);

  return log;
}

async function persistAuditLog(log: AuditLog): Promise<void> {
  try {
    const response = await fetch("/api/admin/audit-logs/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!response.ok) {
      console.error("Failed to persist audit log:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting audit log:", error);
  }
}

export function getAuditLogs(filter: AuditLogFilter = {}): AuditLog[] {
  let filtered = [...auditLogs];

  if (filter.startDate) {
    const startTime = new Date(filter.startDate).getTime();
    filtered = filtered.filter((log) => new Date(log.timestamp).getTime() >= startTime);
  }

  if (filter.endDate) {
    const endTime = new Date(filter.endDate).getTime();
    filtered = filtered.filter((log) => new Date(log.timestamp).getTime() <= endTime);
  }

  if (filter.actorId) {
    filtered = filtered.filter((log) => log.actorId === filter.actorId);
  }

  if (filter.action) {
    filtered = filtered.filter((log) => log.action === filter.action);
  }

  if (filter.resourceType) {
    filtered = filtered.filter((log) => log.resourceType === filter.resourceType);
  }

  if (filter.resourceId) {
    filtered = filtered.filter((log) => log.resourceId === filter.resourceId);
  }

  if (filter.status) {
    filtered = filtered.filter((log) => log.status === filter.status);
  }

  // Sort by timestamp descending
  filtered.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply pagination
  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 50;

  return filtered.slice(offset, offset + limit);
}

export function getAuditLogStats(): AuditLogStats {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay()
  );
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const logsToday = auditLogs.filter(
    (log) => new Date(log.timestamp) >= startOfDay
  );
  const logsThisWeek = auditLogs.filter(
    (log) => new Date(log.timestamp) >= startOfWeek
  );
  const logsThisMonth = auditLogs.filter(
    (log) => new Date(log.timestamp) >= startOfMonth
  );

  const successfulActions = auditLogs.filter(
    (log) => log.status === "success"
  ).length;
  const failedActions = auditLogs.filter(
    (log) => log.status === "failed"
  ).length;

  // Find most active admin
  const adminCounts = auditLogs.reduce(
    (acc, log) => {
      acc[log.actorEmail] = (acc[log.actorEmail] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const mostActiveAdmin =
    Object.entries(adminCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Unknown";

  // Find most modified resource
  const resourceCounts = auditLogs.reduce(
    (acc, log) => {
      const key = `${log.resourceType}:${log.resourceId}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const mostModifiedResource =
    Object.entries(resourceCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Unknown";

  return {
    totalLogs: auditLogs.length,
    successfulActions,
    failedActions,
    actionsToday: logsToday.length,
    actionsThisWeek: logsThisWeek.length,
    actionsThisMonth: logsThisMonth.length,
    mostActiveAdmin,
    mostModifiedResource,
  };
}

export function exportAuditLogs(
  filter: AuditLogFilter = {}
): string {
  const logs = getAuditLogs({ ...filter, limit: 10000, offset: 0 });

  // CSV format
  const headers = [
    "Timestamp",
    "Actor Email",
    "Actor Role",
    "Action",
    "Resource Type",
    "Resource ID",
    "Resource Name",
    "Status",
    "Error Message",
  ];

  const rows = logs.map((log) => [
    log.timestamp,
    log.actorEmail,
    log.actorRole,
    log.action,
    log.resourceType,
    log.resourceId,
    log.resourceName,
    log.status,
    log.errorMessage ?? "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function downloadAuditLogs(filter: AuditLogFilter = {}): void {
  const csv = exportAuditLogs(filter);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `audit-logs-${Date.now()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
