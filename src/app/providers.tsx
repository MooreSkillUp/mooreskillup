"use client";

import { ThemeProvider } from "../lib/theme";
import { AuthProvider } from "../lib/auth";
import { TeacherWorkspaceProvider } from "../lib/teacher-workspace";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TeacherWorkspaceProvider>{children}</TeacherWorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
