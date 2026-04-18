import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { mockUser } from "./mock-data";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  register: (username: string, email: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "mooreskillup.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = useCallback(async (email: string) => {
    await new Promise((r) => setTimeout(r, 350));
    const username = email.split("@")[0] || mockUser.username;
    persist({
      id: mockUser.id,
      username,
      displayName: username
        .split(/[._]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
      email,
      avatar: username.slice(0, 2).toUpperCase(),
    });
  }, []);

  const register = useCallback(async (username: string, email: string) => {
    await new Promise((r) => setTimeout(r, 400));
    persist({
      id: mockUser.id,
      username,
      displayName: username,
      email,
      avatar: username.slice(0, 2).toUpperCase(),
    });
  }, []);

  const logout = useCallback(() => persist(null), []);
  const updateUser = useCallback(
    (patch: Partial<AuthUser>) => setUser((u) => (u ? { ...u, ...patch } : u)),
    [],
  );

  // Avoid SSR/hydration mismatch flash
  if (!hydrated) {
    return (
      <AuthContext.Provider
        value={{ user: null, isAuthenticated: false, login, register, logout, updateUser }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
