import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest, buildApiUrl, getAccessToken } from "./authenticated-api";

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  metadata: Record<string, unknown>;
  changes: Record<string, { before: unknown; after: unknown }>;
  status: "success" | "failed";
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  search?: string;
  action?: string;
  actor?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page?: number;
}

interface AuditLogPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogEntry[];
}

function buildQuery(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.action) params.set("action", filters.action);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.resourceType) params.set("resourceType", filters.resourceType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useAuditLogs(filters: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const query = buildQuery(filters);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    authenticatedRequest<AuditLogPage>(`/api/admin/audit-logs/${query}`)
      .then((payload) => {
        if (!active) return;
        setLogs(payload.results ?? []);
        setCount(payload.count ?? 0);
        setHasNext(Boolean(payload.next));
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load audit logs.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  return { logs, count, hasNext, isLoading, error };
}

export async function downloadAuditLogCsv(filters: AuditLogFilters) {
  const token = getAccessToken();
  const response = await fetch(buildApiUrl(`/api/admin/audit-logs/export/${buildQuery(filters)}`), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Unable to export audit logs. Only the Super Admin can export.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "audit-logs.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface PlatformSettingsData {
  siteName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  studentRegistrationOpen: boolean;
  auditRetentionDays: number;
  requireAdminSecondApproval: boolean;
  allowTeacherAnnouncements: boolean;
  allowModeratorAnnouncements: boolean;
  featureReviewsEnabled: boolean;
  featureCertificatesEnabled: boolean;
  featureRecommendationsEnabled: boolean;
  featureAchievementsEnabled: boolean;
  featureLeaderboardEnabled: boolean;
  featureQuizEnabled: boolean;
  refundWindowDays: number;
  refundMaxProgressPercent: number;
  updatedAt?: string;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await authenticatedRequest<PlatformSettingsData>("/api/admin/settings/");
      setSettings(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSettings = useCallback(async (patch: Partial<PlatformSettingsData>) => {
    const payload = await authenticatedRequest<PlatformSettingsData>("/api/admin/settings/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setSettings(payload);
    return payload;
  }, []);

  return { settings, isLoading, error, refresh, saveSettings };
}
