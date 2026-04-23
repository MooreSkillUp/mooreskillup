import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_STORAGE_KEY = "mooreskillup.access-token";
const REFRESH_TOKEN_STORAGE_KEY = "mooreskillup.refresh-token";

export interface PlatformNotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

function buildApiUrl(endpoint: string) {
  return `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Session refresh is unavailable.");
  }
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error("Your session has expired. Please log in again.");
  }
  const response = await fetch(buildApiUrl("/api/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const payload = await parseJsonSafely(response);
  if (!response.ok || !payload || typeof payload.access !== "string") {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    throw new Error("Your session has expired. Please log in again.");
  }
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, payload.access);
  if (typeof payload.refresh === "string") {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refresh);
  }
  return payload.access as string;
}

async function authenticatedRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("Authenticated requests are unavailable.");
  }

  const send = async (token: string | null) =>
    fetch(buildApiUrl(endpoint), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

  let accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  let response = await send(accessToken);
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    response = await send(accessToken);
  }

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error("Request failed.");
  }

  return payload as T;
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
        Array<{ id: string; title: string; body: string; created_at?: string; createdAt?: string }>
      >("/api/notifications/");
      setNotifications(
        (Array.isArray(payload) ? payload : []).map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
        })),
      );
    } catch {
      setNotifications([]);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllAsRead = useCallback(async () => {
    if (!enabled) return;
    try {
      await authenticatedRequest("/api/notifications/mark-all-read/", { method: "POST" });
      setNotifications([]);
    } catch {
      // ignore for now, page-level error handling covers admin surfaces
    }
  }, [enabled]);

  return {
    notifications,
    markAllAsRead,
    reload: load,
  };
}
