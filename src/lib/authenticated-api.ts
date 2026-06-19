const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_STORAGE_KEY = "mooreskillup.access-token";
const REFRESH_TOKEN_STORAGE_KEY = "mooreskillup.refresh-token";
const USER_STORAGE_KEY = "mooreskillup.user";

let sessionExpiredHandled = false;

/**
 * When the session genuinely expires (no refresh token, or refresh rejected),
 * clear everything and send the user to a clean login screen with a notice —
 * instead of leaving them on a dashboard full of red error banners.
 */
export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  if (sessionExpiredHandled || window.location.pathname.startsWith("/auth")) return;
  sessionExpiredHandled = true;
  window.location.href = "/auth/login?expired=1";
}

interface PaginatedResponse<T> {
  results?: T[];
}

export function buildApiUrl(endpoint: string) {
  return `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  if ("detail" in payload && typeof payload.detail === "string") return payload.detail;

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return fallback;
}

export function normalizeListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    "results" in payload &&
    Array.isArray((payload as PaginatedResponse<T>).results)
  ) {
    return (payload as PaginatedResponse<T>).results ?? [];
  }
  return [];
}

export async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Session refresh is unavailable.");
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    handleSessionExpired();
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(buildApiUrl("/api/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const payload = await parseJsonSafely(response);
  if (!response.ok || !payload || typeof payload.access !== "string") {
    handleSessionExpired();
    throw new Error(extractErrorMessage(payload, "Your session has expired. Please log in again."));
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, payload.access);
  if (typeof payload.refresh === "string") {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refresh);
  }
  return payload.access as string;
}

export async function authenticatedRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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
    throw new Error(extractErrorMessage(payload, "Request failed."));
  }

  return payload as T;
}
