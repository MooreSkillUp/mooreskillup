import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  mockUser,
  trackOptionsByInterest,
  type Interest,
  type TrackName,
  type UserPlan,
  type UserRole,
} from "./mock-data";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  avatarUrl?: string;
  plan: UserPlan;
  role: UserRole;
  interests: Interest[];
  wishlist: string[];
  selectedInterest: Interest;
  selectedTrack: TrackName;
}

interface RegisterPayload {
  username: string;
  email: string;
  interests: Interest[];
  selectedInterest: Interest;
  selectedTrack: TrackName;
  plan?: UserPlan;
  role?: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  toggleWishlist: (courseId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "mooreskillup.user";

export function toDisplayName(username: string) {
  return username
    .split(/[._]/)
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

function inferRoleFromEmail(email: string): UserRole {
  if (email.includes("admin")) return "admin";
  if (email.includes("teacher") || email.includes("mentor")) return "teacher";
  return "student";
}

function inferLearningFocus(email: string): {
  interests: Interest[];
  selectedInterest: Interest;
  selectedTrack: TrackName;
} {
  const lower = email.toLowerCase();

  if (lower.includes("design") || lower.includes("figma")) {
    return {
      interests: ["Graphics and Design"],
      selectedInterest: "Graphics and Design",
      selectedTrack: "UI/UX Design",
    };
  }

  if (lower.includes("cloud") || lower.includes("devops")) {
    return {
      interests: ["Cloud and DevOps"],
      selectedInterest: "Cloud and DevOps",
      selectedTrack: "DevOps Engineering",
    };
  }

  return {
    interests: mockUser.interests,
    selectedInterest: mockUser.selectedInterest,
    selectedTrack: mockUser.selectedTrack,
  };
}

function normalizeUser(raw: Partial<AuthUser> | null): AuthUser | null {
  if (!raw) return null;

  const selectedInterest = raw.selectedInterest ?? mockUser.selectedInterest;
  const fallbackTrack = trackOptionsByInterest[selectedInterest][0];

  return {
    id: raw.id ?? mockUser.id,
    username: raw.username ?? mockUser.username,
    displayName: raw.displayName ?? mockUser.displayName,
    email: raw.email ?? mockUser.email,
    avatar: raw.avatar ?? mockUser.avatar,
    avatarUrl: raw.avatarUrl,
    plan: raw.plan ?? mockUser.plan,
    role: raw.role ?? mockUser.role,
    interests:
      Array.isArray(raw.interests) && raw.interests.length
        ? raw.interests
        : [selectedInterest],
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist : [],
    selectedInterest,
    selectedTrack: raw.selectedTrack ?? fallbackTrack,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        setUser(normalizeUser(parsed));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = (nextUser: AuthUser | null) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized);
    if (typeof window !== "undefined") {
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return normalized;
  };

  const login = useCallback(async (email: string) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const username = email.split("@")[0] || mockUser.username;
    const focus = inferLearningFocus(email);

    return persist({
      id: mockUser.id,
      username,
      displayName: toDisplayName(username),
      email,
      avatar: username.slice(0, 2).toUpperCase(),
      avatarUrl: undefined,
      plan:
        email.includes("premium") ? "premium" : email.includes("pro") ? "pro" : mockUser.plan,
      role: inferRoleFromEmail(email),
      interests: focus.interests,
      wishlist: mockUser.wishlist,
      selectedInterest: focus.selectedInterest,
      selectedTrack: focus.selectedTrack,
    })!;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return persist({
      id: mockUser.id,
      username: payload.username,
      displayName: toDisplayName(payload.username),
      email: payload.email,
      avatar: payload.username.slice(0, 2).toUpperCase(),
      avatarUrl: undefined,
      plan: payload.plan ?? "free",
      role: payload.role ?? "student",
      interests: payload.interests.length ? payload.interests : [payload.selectedInterest],
      wishlist: [],
      selectedInterest: payload.selectedInterest,
      selectedTrack: payload.selectedTrack,
    })!;
  }, []);

  const logout = useCallback(() => persist(null), []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => {
      const nextUser = normalizeUser({ ...(current ?? {}), ...patch });
      if (typeof window !== "undefined") {
        if (nextUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        }
      }
      return nextUser;
    });
  }, []);

  const toggleWishlist = useCallback((courseId: string) => {
    setUser((current) => {
      const normalized = normalizeUser(current);
      if (!normalized) return normalized;
      const exists = normalized.wishlist.includes(courseId);
      const wishlist = exists
        ? normalized.wishlist.filter((item) => item !== courseId)
        : [...normalized.wishlist, courseId];
      const nextUser = { ...normalized, wishlist };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      }
      return nextUser;
    });
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    toggleWishlist,
  };

  if (!hydrated) {
    return (
      <AuthContext.Provider
        value={{ ...value, user: null, isAuthenticated: false }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
