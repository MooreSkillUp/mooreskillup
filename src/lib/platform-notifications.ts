import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedRequest, normalizeListPayload } from "@/lib/authenticated-api";

export interface PlatformNotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  sender: string;
  isRead: boolean;
}

export function usePlatformNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([]);

  const load = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      return;
    }
    try {
      const payload = await authenticatedRequest<
        Array<{
          id: string;
          title: string;
          body: string;
          created_at?: string;
          createdAt?: string;
          sender?: string;
          is_read?: boolean;
        }>
      >("/api/notifications/");
      setNotifications(
        normalizeListPayload<{
          id: string;
          title: string;
          body: string;
          created_at?: string;
          createdAt?: string;
          sender?: string;
          is_read?: boolean;
        }>(payload).map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
          sender: item.sender ?? "MooreSkillUp",
          isRead: Boolean(item.is_read),
        })),
      );
    } catch {
      setNotifications([]);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const markAllAsRead = useCallback(async () => {
    if (!enabled) return;
    try {
      await authenticatedRequest("/api/notifications/mark-all-read/", { method: "POST" });
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch {
      // ignore for now, page-level error handling covers role dashboards
    }
  }, [enabled]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!enabled) return;
    await authenticatedRequest(`/api/notifications/${notificationId}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: true }),
    });
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
    );
  }, [enabled]);

  const clearAll = useCallback(async () => {
    if (!enabled) return;
    await authenticatedRequest("/api/notifications/clear/", { method: "DELETE" });
    setNotifications([]);
  }, [enabled]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!enabled) return;
    await authenticatedRequest(`/api/notifications/${notificationId}/`, { method: "DELETE" });
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
  }, [enabled]);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAll,
    deleteNotification,
    reload: load,
  };
}
