"use client";

import { ThemeProvider } from "../lib/theme";
import { AuthProvider } from "../lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
