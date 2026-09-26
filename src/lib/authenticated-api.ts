const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let accessTokenMemory: string | null = null;
let accessTokenRefreshTimer: number | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionExpiredHandled = false;

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

/** Turn snake_case and camelCase field names into something readable. */
function fieldLabel(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  if ("detail" in payload && typeof payload.detail === "string") return payload.detail;

  // Field errors arrive as { subcategory: ["This field may not be null."] }.
  // "This field may not be blank" on its own tells nobody which field, and a
  // teacher cannot act on it — so the field is named in the message.
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const message = typeof value === "string" ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
    if (!message) continue;
    if (key === "non_field_errors" || key === "nonFieldErrors") return message;
    return `${fieldLabel(key)}: ${message}`;
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

function decodeJwtPayload(token: string): { exp?: number } {
  const [, payload] = token.split(".");
  if (!payload || typeof atob !== "function") return {};
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return {};
  }
}

function clearRefreshTimer() {
  if (accessTokenRefreshTimer) {
    clearTimeout(accessTokenRefreshTimer);
    accessTokenRefreshTimer = null;
  }
}

function scheduleRefresh(token: string | null) {
  clearRefreshTimer();
  if (typeof window === "undefined" || !token) return;

  const payload = decodeJwtPayload(token);
  if (!payload.exp) return;

  const refreshAt = payload.exp * 1000 - 60_000;
  const delay = Math.max(5_000, refreshAt - Date.now());
  accessTokenRefreshTimer = window.setTimeout(() => {
    void refreshAccessToken().catch(() => {
      handleSessionExpired();
    });
  }, delay);
}

/**
 * Refresh when the app comes back to the foreground.
 *
 * The scheduled timer above is not enough on its own: browsers throttle timers
 * in background tabs, and a phone that sleeps stops firing them entirely. An
 * installed PWA reopened after a few hours would otherwise carry a long-dead
 * access token into its first request. That request recovers via the 401 retry
 * path, but only after failing once — refreshing on focus means the app is
 * already authenticated by the time anything asks.
 */
function refreshIfTokenIsStale() {
  if (!accessTokenMemory) return;

  const { exp } = decodeJwtPayload(accessTokenMemory);
  if (!exp) return;

  const expiresWithinAMinute = exp * 1000 - Date.now() < 60_000;
  if (expiresWithinAMinute) {
    void refreshAccessToken().catch(() => {
      // refreshAccessToken already routes to login when the session is gone.
    });
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshIfTokenIsStale();
  });
  window.addEventListener("focus", refreshIfTokenIsStale);
}

export function getAccessToken() {
  return accessTokenMemory;
}

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  sessionExpiredHandled = false;
  scheduleRefresh(token);
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function handleSessionExpired() {
  clearAccessToken();
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth")) return;
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  window.location.href = "/auth/login?expired=1";
}

/**
 * The refresh token used to be mirrored into localStorage.
 *
 * That was the cost of the app and the API sitting on different domains: the
 * session cookie was third-party, Safari blocked it outright, and an installed
 * PWA partitioned it away, so every launch landed on the sign-in screen. A
 * token in localStorage is readable by any script on the page, and the comment
 * here said to delete it the moment the two shared a domain.
 *
 * They do now — app.mooreskillup.com and api.mooreskillup.com — so the cookie
 * carries the session and nothing is stored where a script can read it. This
 * clears the old value from browsers that still hold one.
 */
const RETIRED_REFRESH_KEY = "mooreskillup.refresh";

function forgetRetiredRefreshToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RETIRED_REFRESH_KEY);
  } catch {
    // Private mode or blocked storage: nothing was stored to begin with.
  }
}

if (typeof window !== "undefined") forgetRetiredRefreshToken();

async function refreshAccessTokenInternal() {
  // The session cookie is httpOnly and same-site, and `credentials: "include"`
  // is what sends it. Nothing else carries the session.
  const response = await fetch(buildApiUrl("/api/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const payload = await parseJsonSafely(response);
  if (!response.ok || !payload || typeof payload.access !== "string") {
    throw new Error(extractErrorMessage(payload, "Your session has expired. Please log in again."));
  }

  setAccessToken(payload.access as string);
  return payload.access as string;
}

export async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Session refresh is unavailable.");
  }

  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshAccessTokenInternal()
    .catch((error: unknown) => {
      handleSessionExpired();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function authenticatedRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("Authenticated requests are unavailable.");
  }

  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const send = async (token: string | null) =>
    fetch(buildApiUrl(endpoint), {
      ...options,
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

  // The access token lives in memory only, so every full page load starts
  // without one. Firing anyway meant each page opened with two or three
  // requests that were guaranteed to 401 before the refresh caught up — wasted
  // round trips on every navigation, and slowest exactly where it hurts most:
  // a cold-start API on a phone. Refresh first when we have nothing.
  //
  // refreshAccessToken() de-duplicates concurrent callers, so a page firing
  // four requests at once still performs a single refresh.
  let token = accessTokenMemory;
  if (!token) {
    token = await refreshAccessToken();
  }

  let response = await send(token);
  if (response.status === 401) {
    // Still refused: the token we had has expired mid-flight. One retry.
    const nextAccessToken = await refreshAccessToken();
    response = await send(nextAccessToken);
  }

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    // The status code goes in the fallback: an HTML 404 or 502 parses to
    // nothing, and "Request failed." alone gives no way to start looking.
    throw new Error(extractErrorMessage(payload, `Request failed (${response.status}).`));
  }

  return payload as T;
}
