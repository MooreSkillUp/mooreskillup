import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Settings, LogOut, GraduationCap, X, Trophy, Award, Medal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/achievements", label: "Achievements", icon: Medal },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-bold tracking-tight">MooreSkillUp</div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active =
              location.pathname === to ||
              (to === "/courses" && location.pathname.startsWith("/course"));
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
