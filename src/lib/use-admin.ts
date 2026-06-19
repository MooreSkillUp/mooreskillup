/**
 * Comprehensive Admin Integration Hook
 * Integrates all admin systems: RBAC, audit logging, real-time updates, analytics, bulk operations
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth";
import { hasPermission, hasUserPermission, type AdminResourceAction, type AdminRole } from "./admin-rbac";
import { createAuditLog, type AuditActionType } from "./admin-audit";
import { startAutoRefresh, subscribeToEvent, type RealtimeEventType, type RealtimeEvent } from "./realtime";
import { getAnalyticsSnapshot, refreshAnalytics } from "./admin-analytics";
import { getSettings } from "./admin-settings";

export interface UseAdminOptions {
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
  enableAuditLogging?: boolean;
  enableRealtimeEvents?: boolean;
  page?: string;
  dataKey?: string;
}

export function useAdmin(options: UseAdminOptions = {}) {
  const {
    enableAutoRefresh = true,
    autoRefreshInterval = 60000,
    enableAuditLogging = true,
    enableRealtimeEvents = true,
    page = "dashboard",
    dataKey = "admin-data",
  } = options;

  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  // Admin tier comes from the backend via /api/auth/me/
  const adminRole = useMemo((): AdminRole | null => {
    if (user?.role !== "admin") return null;
    return (user.adminRole as AdminRole | null) ?? "super-admin";
  }, [user]);

  // The backend's permission list is the source of truth; the local matrix is
  // only a fallback for sessions cached before permissions were introduced.
  // const can = useCallback(
  //   (action: AdminResourceAction): boolean => {
  //     if (!adminRole) return false;
  //     if (user?.permissions?.length) {
  //       return user.permissions.includes(action);
  //     }
  //     return hasPermission(adminRole, action);
  //   },
  //   [adminRole, user]
  // );

  const can = useCallback(
  (action: AdminResourceAction): boolean => {
    if (!adminRole) return false;
    if (user?.permissions?.length) {
      return hasUserPermission(user.permissions, action); // live, override-aware
    }
    return hasPermission(adminRole, action); // fallback for stale cached sessions only
  },
    [adminRole, user],
  );

  const cannot = useCallback(
    (action: AdminResourceAction): boolean => {
      return !can(action);
    },
    [can]
  );

  // Audit logging
  const logAction = useCallback(
    async (
      action: AuditActionType,
      resourceType: string,
      resourceId: string,
      resourceName: string,
      metadata: Record<string, unknown> = {},
      changes: Record<string, { before: unknown; after: unknown }> = {}
    ) => {
      if (!enableAuditLogging || !user) return;

      try {
        createAuditLog(
          user.id,
          user.role,
          user.email,
          action,
          resourceType,
          resourceId,
          resourceName,
          metadata,
          changes,
          "success"
        );
      } catch (err) {
        console.error("Failed to log audit action:", err);
      }
    },
    [enableAuditLogging, user]
  );

  // Real-time event subscription
  const subscribeToRealtimeEvent = useCallback(
    (eventType: RealtimeEventType, callback: (event: RealtimeEvent) => void) => {
      if (!enableRealtimeEvents) return () => {};

      try {
        const unsubscribe = subscribeToEvent(eventType, callback);
        cleanupFnsRef.current.push(unsubscribe);
        return unsubscribe;
      } catch (err) {
        console.error("Failed to subscribe to realtime event:", err);
        return () => {};
      }
    },
    [enableRealtimeEvents]
  );

  // Refresh analytics
  const refreshAdminAnalytics = useCallback(async () => {
    if (!can("analytics:view")) return;

    setIsLoading(true);
    try {
      await refreshAnalytics();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh analytics";
      setError(message);
      console.error("Analytics refresh error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [can]);

  // Get current analytics snapshot
  const analytics = useMemo(() => {
    if (!can("analytics:view")) return null;
    return getAnalyticsSnapshot();
  }, [can]);

  // Get system settings
  const settings = useMemo(() => {
    if (!can("admin-settings:view")) return null;
    return getSettings();
  }, [can]);

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh || !can("analytics:view")) return;

    const cleanup = startAutoRefresh(
      {
        enabled: true,
        interval: autoRefreshInterval,
        page,
        dataKey,
      },
      refreshAdminAnalytics
    );

    cleanupFnsRef.current.push(cleanup);

    return cleanup;
  }, [
    enableAutoRefresh,
    can,
    autoRefreshInterval,
    page,
    dataKey,
    refreshAdminAnalytics,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFnsRef.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      });
      cleanupFnsRef.current = [];
    };
  }, []);

  return {
    // User and role info
    adminRole,
    isAdmin: !!adminRole,

    // Permissions
    can,
    cannot,

    // Audit logging
    logAction,

    // Real-time events
    subscribeToRealtimeEvent,

    // Analytics and settings
    analytics,
    settings,
    refreshAdminAnalytics,

    // Loading and error states
    isLoading,
    error,

    // Check if maintenance mode is enabled
    isInMaintenanceMode: settings?.maintenanceMode ?? false,
  };
}

/**
 * Hook for checking specific permissions
 */
export function useAdminPermission(action: AdminResourceAction) {
  const { can, cannot } = useAdmin();

  return {
    can: can(action),
    cannot: cannot(action),
  };
}

/**
 * Hook for checking multiple permissions
 */
export function useAdminPermissions(actions: AdminResourceAction[]) {
  const { can } = useAdmin();

  return useMemo(
    () => ({
      hasAll: actions.every((action) => can(action)),
      hasAny: actions.some((action) => can(action)),
      permissions: actions.reduce(
        (acc, action) => {
          acc[action] = can(action);
          return acc;
        },
        {} as Record<AdminResourceAction, boolean>
      ),
    }),
    [can, actions]
  );
}

/**
 * Hook for audit logging with permission check
 */
export function useAuditLog() {
  const { logAction, can } = useAdmin({ enableAuditLogging: true });

  return useCallback(
    async (
      action: AuditActionType,
      resourceType: string,
      resourceId: string,
      resourceName: string,
      metadata?: Record<string, unknown>,
      changes?: Record<string, { before: unknown; after: unknown }>
    ) => {
      if (!can("activity-logs:view")) {
        console.warn("No permission to log audit actions");
        return;
      }

      return logAction(action, resourceType, resourceId, resourceName, metadata, changes);
    },
    [logAction, can]
  );
}

/**
 * Hook for real-time event handling
 */
export function useRealtimeEvent(
  eventType: RealtimeEventType,
  callback: (event: RealtimeEvent) => void
) {
  const { subscribeToRealtimeEvent } = useAdmin({ enableRealtimeEvents: true });

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeEvent(eventType, callback);
    return unsubscribe;
  }, [subscribeToRealtimeEvent, eventType, callback]);
}

/**
 * Hook for auto-refreshing data on a specific page
 */
export function useAdminAutoRefresh(
  page: string,
  dataKey: string,
  refreshInterval: number = 60000
) {
  const { refreshAdminAnalytics, isLoading } = useAdmin({
    enableAutoRefresh: true,
    autoRefreshInterval: refreshInterval,
    page,
    dataKey,
  });

  return {
    refresh: refreshAdminAnalytics,
    isRefreshing: isLoading,
  };
}
