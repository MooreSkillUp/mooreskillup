import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "system" | "light" | "dark";
type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  mode: Mode;
  toggle: () => void;
  setMode: (mode: Mode) => void;
} | null>(null);

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to "system" — the app follows the OS light/dark setting until the
  // user explicitly overrides it with the toggle.
  const [mode, setModeState] = useState<Mode>("system");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("mooreskillup.theme-mode")) as Mode | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const resolved: Theme = mode === "system" ? systemTheme() : mode;
      setTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    apply();
    localStorage.setItem("mooreskillup.theme-mode", mode);

    // When following the system, react live to OS theme changes.
    if (mode === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [mode]);

  const setMode = (next: Mode) => setModeState(next);
  // Manual toggle overrides system with an explicit choice.
  const toggle = () => setModeState(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, mode, toggle, setMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
