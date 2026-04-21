"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Medal,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { getHomeRouteForUser, useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const homeHref = getHomeRouteForUser(user);
  const role = user?.role ?? "student";

  const studentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
    { href: "/quiz-shop", label: "Quiz Shop", icon: ShoppingBag },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/achievements", label: "Achievements", icon: Medal },
    { href: "/certificates", label: "Certificates", icon: Award },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: "Admin dashboard", icon: Shield },
    { href: "/admin/courses", label: "Admin courses", icon: FolderKanban },
    { href: "/admin/users", label: "Admin users", icon: Users },
  ];

  const teacherLinks = [
    { href: "/teacher/dashboard", label: "Teacher dashboard", icon: LayoutDashboard },
    { href: "/teacher/upload", label: "Teacher upload", icon: Upload },
    { href: "/teacher/settings", label: "Teacher settings", icon: Settings },
  ];

  const navGroups =
    role === "admin"
      ? [{ title: "Admin", items: adminLinks }]
      : role === "teacher"
        ? [{ title: "Teacher", items: teacherLinks }]
        : [{ title: "Student", items: studentLinks }];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <BrandLogo
            href={homeHref}
            size="sm"
            subtitle={`${role.charAt(0).toUpperCase()}${role.slice(1)} workspace`}
            className="[&_.text-muted-foreground]:text-sidebar-foreground/60 [&_.font-display]:text-sidebar-foreground"
          />
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-sidebar-foreground/55">
                {group.title}
              </div>
              <nav className="mt-2 space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href === "/dashboard/courses" && pathname?.startsWith("/course"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
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
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => {
              logout();
              onClose();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
