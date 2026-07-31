"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AppLoader } from "@/components/shared/AppLoader";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { getHomeRouteForUser, useAuth } from "../../lib/auth";
import type { UserRole } from "../../lib/taxonomy-types";
import { OnboardingTour } from "./OnboardingTour";

export function AppShell({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push(getHomeRouteForUser(user));
    }
  }, [allowedRoles, isAuthenticated, isLoading, router, user]);

  if (isLoading) return <AppLoader fullScreen label="Loading your dashboard" />;
  if (!isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return (
    // 100dvh rather than h-screen: mobile browsers shrink the viewport when the
    // address bar collapses, and h-screen leaves a dead strip at the bottom.
    <div
      className="flex h-[100dvh] w-full overflow-hidden bg-background"
      style={{
        // Keeps the sidebar and top bar clear of the notch, and the last row of
        // content clear of the home indicator, when running as an installed PWA.
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar onMenu={() => setSidebarOpen(true)} />
        <motion.main
          id="tour-content"
          key={typeof window !== "undefined" ? window.location.pathname : "page"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </motion.main>
      </div>
      <OnboardingTour />
    </div>
  );
}
