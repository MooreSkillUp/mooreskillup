import { Navigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar onMenu={() => setSidebarOpen(true)} />
        <motion.main
          key={typeof window !== "undefined" ? window.location.pathname : "page"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
