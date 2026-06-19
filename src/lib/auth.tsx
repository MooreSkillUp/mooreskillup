import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  interests as allInterests,
  trackOptionsByInterest,
  type Interest,
  type TrackName,
  type UserPlan,
  type UserRole,
} from "./mock-data";

export type AdminRole = "super-admin" | "admin" | "moderator";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  avatarUrl?: string;
  plan: UserPlan;
  role: UserRole;
  /** Admin tier from the backend; only set when role === "admin". */
  adminRole?: AdminRole | null;
  /** Effective admin permissions granted by the backend (source of truth). */
  permissions?: string[];
  interests: Interest[];
  wishlist: string[];
  selectedInterest: Interest;
  selectedTrack: TrackName;
  selectedTracks: TrackName[];
  purchasedCourseIds: string[];
  status?: "active" | "disabled";
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
}

/** Returned by login() when the account requires an emailed 2FA code. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  userId: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  interests: Interest[];
  selectedInterest: Interest;
  selectedTrack: TrackName;
  selectedTracks?: TrackName[];
  plan?: UserPlan;
  role?: UserRole;
  adminRegistrationToken?: string;
}

interface PasswordResetRequestResult {
  ok: boolean;
  message: string;
  debugToken?: string;
  debugResetUrl?: string;
  /** Present in DEBUG when using console email or SMTP failure — explains why inbox is empty */
  emailHint?: string;
}

interface PasswordResetConfirmResult {
  ok: boolean;
  message: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | TwoFactorChallenge>;
  verifyTwoFactor: (userId: string, code: string) => Promise<AuthUser>;
  toggleTwoFactor: (enabled: boolean) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  resetPassword: (token: string, nextPassword: string) => Promise<PasswordResetConfirmResult>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => Promise<AuthUser | null>;
  toggleWishlist: (courseId: string) => Promise<void>;
  refreshCurrentUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = "mooreskillup.user";
const ACCESS_TOKEN_STORAGE_KEY = "mooreskillup.access-token";
const REFRESH_TOKEN_STORAGE_KEY = "mooreskillup.refresh-token";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_INTEREST = (allInterests[0] ?? "Backend Development") as Interest;

export function toDisplayName(username: string) {
  return username
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getHomeRouteForRole(role: UserRole = "student") {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/dashboard";
}

export function getHomeRouteForUser(user?: Pick<AuthUser, "role"> | null) {
  return getHomeRouteForRole(user?.role ?? "student");
}

/** Human label for a user's effective role (admins resolve to their tier). */
export function getRoleLabel(user?: Pick<AuthUser, "role" | "adminRole"> | null) {
  if (user?.role === "admin") {
    if (user.adminRole === "super-admin") return "Super Admin";
    if (user.adminRole === "moderator") return "Moderator";
    return "Admin";
  }
  if (user?.role === "teacher") return "Teacher";
  return "Student";
}

export function getWorkspaceLabel(user?: Pick<AuthUser, "role" | "adminRole"> | null) {
  return `${getRoleLabel(user)} workspace`;
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

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  const entries = Object.entries(payload as Record<string, unknown>);
  for (const [, value] of entries) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return fallback;
}

function getAvatar(displayName: string, avatar?: string) {
  if (avatar) return avatar;
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeAdminRole(value: unknown): AdminRole | null {
  if (typeof value !== "string" || !value) return null;
  // Backend uses snake_case codes (super_admin); the UI uses kebab-case.
  const normalized = value.replace(/_/g, "-");
  return normalized === "super-admin" || normalized === "admin" || normalized === "moderator"
    ? normalized
    : null;
}

function normalizeUser(raw: Partial<AuthUser> | null): AuthUser | null {
  if (!raw?.id || !raw.email) return null;

  const selectedInterest = (raw.selectedInterest ?? raw.interests?.[0] ?? DEFAULT_INTEREST) as Interest;
  const fallbackTrack = ((trackOptionsByInterest as Record<string, TrackName[]>)[selectedInterest]?.[0] ?? "Backend with Python") as TrackName;
  const selectedTracks =
    Array.isArray(raw.selectedTracks) && raw.selectedTracks.length
      ? (raw.selectedTracks as TrackName[])
      : [((raw.selectedTrack as TrackName | undefined) ?? fallbackTrack)];
  const selectedTrack = ((raw.selectedTrack as TrackName | undefined) ?? selectedTracks[0] ?? fallbackTrack) as TrackName;
  const displayName = raw.displayName ?? toDisplayName(raw.username ?? raw.email.split("@")[0] ?? "Learner");

  return {
    id: raw.id,
    username: raw.username ?? raw.email.split("@")[0] ?? "learner",
    displayName,
    email: raw.email,
    avatar: getAvatar(displayName, raw.avatar),
    avatarUrl: raw.avatarUrl,
    plan: (raw.plan ?? "free") as UserPlan,
    role: (raw.role ?? "student") as UserRole,
    adminRole: normalizeAdminRole(raw.adminRole),
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    interests:
      Array.isArray(raw.interests) && raw.interests.length
        ? (raw.interests as Interest[])
        : [selectedInterest],
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist : [],
    selectedInterest,
    selectedTrack,
    selectedTracks,
    purchasedCourseIds: Array.isArray(raw.purchasedCourseIds) ? raw.purchasedCourseIds : [],
    status: (raw.status ?? "active") as "active" | "disabled",
    mustChangePassword: Boolean(raw.mustChangePassword),
    twoFactorEnabled: Boolean(raw.twoFactorEnabled),
  };
}

function readStorage(key: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const persistUser = useCallback((nextUser: Partial<AuthUser> | AuthUser | null) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized);
    writeStorage(USER_STORAGE_KEY, normalized ? JSON.stringify(normalized) : null);
    return normalized;
  }, []);

  const persistTokens = useCallback((accessToken: string | null, refreshToken?: string | null) => {
    accessTokenRef.current = accessToken;
    writeStorage(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    if (typeof refreshToken !== "undefined") {
      refreshTokenRef.current = refreshToken;
      writeStorage(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  }, []);

  const clearSession = useCallback(() => {
    persistTokens(null, null);
    persistUser(null);
  }, [persistTokens, persistUser]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
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
      clearSession();
      throw new Error(extractErrorMessage(payload, "Your session has expired. Please log in again."));
    }

    persistTokens(payload.access, typeof payload.refresh === "string" ? payload.refresh : refreshToken);
    return payload.access as string;
  }, [clearSession, persistTokens]);

  const authenticatedRequest = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      const send = async (accessToken?: string | null) =>
        fetch(buildApiUrl(endpoint), {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(options?.headers ?? {}),
          },
        });

      let response = await send(accessTokenRef.current);
      if (response.status === 401 && refreshTokenRef.current) {
        const nextAccessToken = await refreshAccessToken();
        response = await send(nextAccessToken);
      }

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Request failed."));
      }

      return payload;
    },
    [refreshAccessToken],
  );

  const refreshCurrentUser = useCallback(async () => {
    if (!accessTokenRef.current && !refreshTokenRef.current) {
      clearSession();
      return null;
    }

    try {
      const payload = await authenticatedRequest("/api/auth/me/", { method: "GET" });
      return persistUser(payload);
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [authenticatedRequest, clearSession, persistUser]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const cachedUser = readStorage(USER_STORAGE_KEY);
        const accessToken = readStorage(ACCESS_TOKEN_STORAGE_KEY);
        const refreshToken = readStorage(REFRESH_TOKEN_STORAGE_KEY);

        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser) as Partial<AuthUser>;
            if (active) {
              setUser(normalizeUser(parsed));
            }
          } catch {
            writeStorage(USER_STORAGE_KEY, null);
          }
        }

        accessTokenRef.current = accessToken;
        refreshTokenRef.current = refreshToken;

        if (accessToken || refreshToken) {
          try {
            await refreshCurrentUser();
          } catch {
            if (active) {
              clearSession();
            }
          }
        } else if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [clearSession, refreshCurrentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(buildApiUrl("/api/auth/login/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await parseJsonSafely(response);
      if (response.ok && payload?.twoFactorRequired && payload?.userId) {
        return { twoFactorRequired: true as const, userId: payload.userId as string };
      }
      if (!response.ok || !payload?.user || !payload?.access || !payload?.refresh) {
        throw new Error(extractErrorMessage(payload, "Unable to sign in."));
      }

      persistTokens(payload.access as string, payload.refresh as string);
      const nextUser = persistUser(payload.user);
      if (!nextUser) {
        throw new Error("Unable to load your account.");
      }
      return nextUser;
    },
    [persistTokens, persistUser],
  );

  const verifyTwoFactor = useCallback(
    async (userId: string, code: string) => {
      const response = await fetch(buildApiUrl("/api/auth/login/verify-2fa/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const payload = await parseJsonSafely(response);
      if (!response.ok || !payload?.user || !payload?.access || !payload?.refresh) {
        throw new Error(extractErrorMessage(payload, "That code was not accepted."));
      }
      persistTokens(payload.access as string, payload.refresh as string);
      const nextUser = persistUser(payload.user);
      if (!nextUser) {
        throw new Error("Unable to load your account.");
      }
      return nextUser;
    },
    [persistTokens, persistUser],
  );

  const toggleTwoFactor = useCallback(
    async (enabled: boolean) => {
      const updated = (await authenticatedRequest("/api/auth/two-factor/", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      })) as { twoFactorEnabled: boolean };
      setUser((current) => (current ? { ...current, twoFactorEnabled: updated.twoFactorEnabled } : current));
      return updated.twoFactorEnabled;
    },
    [authenticatedRequest],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const endpoint =
        payload.role === "admin" ? "/api/auth/admin-register/" : "/api/auth/register/";

      const response = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          username: payload.username,
          displayName: payload.displayName,
          password: payload.password,
          role: payload.role ?? "student",
          interests: payload.interests,
          selectedInterest: payload.selectedInterest,
          selectedTrack: payload.selectedTrack,
          selectedTracks: payload.selectedTracks ?? [payload.selectedTrack],
          plan: payload.plan ?? "free",
          adminRegistrationToken: payload.adminRegistrationToken,
        }),
      });
      const responsePayload = await parseJsonSafely(response);
      if (!response.ok || !responsePayload?.user || !responsePayload?.access || !responsePayload?.refresh) {
        throw new Error(extractErrorMessage(responsePayload, "Unable to create your account."));
      }

      persistTokens(responsePayload.access as string, responsePayload.refresh as string);
      const nextUser = persistUser(responsePayload.user);
      if (!nextUser) {
        throw new Error("Unable to load your account.");
      }
      return nextUser;
    },
    [persistTokens, persistUser],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await fetch(buildApiUrl("/api/auth/password-reset/request/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "Unable to send reset email."));
    }

    return {
      ok: true,
      message:
        typeof payload?.detail === "string"
          ? payload.detail
          : "If the account exists, a reset link has been sent.",
      debugToken: typeof payload?.debugToken === "string" ? payload.debugToken : undefined,
      debugResetUrl: typeof payload?.debugResetUrl === "string" ? payload.debugResetUrl : undefined,
      emailHint: typeof payload?.emailHint === "string" ? payload.emailHint : undefined,
    };
  }, []);

  const resetPassword = useCallback(async (token: string, nextPassword: string) => {
    const response = await fetch(buildApiUrl("/api/auth/password-reset/confirm/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: nextPassword }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      return {
        ok: false,
        message: extractErrorMessage(payload, "Unable to reset password."),
      };
    }

    return {
      ok: true,
      message:
        typeof payload?.detail === "string" ? payload.detail : "Password reset successful.",
    };
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback(
    async (patch: Partial<AuthUser>) => {
      const optimisticUser = persistUser({ ...(user ?? {}), ...patch });
      const syncableKeys = [
        "username",
        "displayName",
        "avatarUrl",
        "selectedInterest",
        "selectedTrack",
        "selectedTracks",
        "interests",
      ] as const;

      const payload = Object.fromEntries(
        syncableKeys
          .filter((key) => typeof patch[key] !== "undefined")
          .map((key) => [key, patch[key]]),
      );

      if (!Object.keys(payload).length || !accessTokenRef.current) {
        return optimisticUser;
      }

      try {
        const nextUser = await authenticatedRequest("/api/auth/me/", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        return persistUser(nextUser);
      } catch (error) {
        persistUser(user);
        throw error;
      }
    },
    [authenticatedRequest, persistUser, user],
  );

  const toggleWishlist = useCallback(
    async (courseId: string) => {
      if (!user || user.role !== "student") return;

      const exists = user.wishlist.includes(courseId);
      const optimisticWishlist = exists
        ? user.wishlist.filter((item) => item !== courseId)
        : [...user.wishlist, courseId];

      persistUser({ ...user, wishlist: optimisticWishlist });

      if (!accessTokenRef.current) return;

      try {
        if (exists) {
          await authenticatedRequest(`/api/watchlist/${courseId}/`, { method: "DELETE" });
        } else {
          await authenticatedRequest("/api/watchlist/", {
            method: "POST",
            body: JSON.stringify({ course_id: courseId }),
          });
        }
        await refreshCurrentUser();
      } catch (error) {
        persistUser(user);
        throw error;
      }
    },
    [authenticatedRequest, persistUser, refreshCurrentUser, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      verifyTwoFactor,
      toggleTwoFactor,
      register,
      requestPasswordReset,
      resetPassword,
      logout,
      updateUser,
      toggleWishlist,
      refreshCurrentUser,
    }),
    [
      isLoading,
      login,
      verifyTwoFactor,
      toggleTwoFactor,
      logout,
      refreshCurrentUser,
      register,
      requestPasswordReset,
      resetPassword,
      toggleWishlist,
      updateUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
