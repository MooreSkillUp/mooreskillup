"use client";

import { Toaster } from "@/components/ui/sonner";
import { FeedbackProvider } from "@/lib/feedback";
import { ThemeProvider } from "../lib/theme";
import { AuthProvider } from "../lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedbackProvider>
          {children}
          <Toaster richColors position="top-right" />
        </FeedbackProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
