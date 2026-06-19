"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Medal,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  Upload,
  UserPlus,
  Users,
  Waves,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useAdminPlatform } from "@/lib/admin-platform";
import { usePlatformNotifications } from "@/lib/platform-notifications";
import { getHomeRouteForUser, getRoleLabel, useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const homeHref = getHomeRouteForUser(user);
  const role = user?.role ?? "student";
  const platformNotifications = usePlatformNotifications(role !== "admin" && !!user);
  const { systemAlerts } = useAdminPlatform({ enabled: role === "admin" && !!user });
  const adminNotificationBadge = (systemAlerts.pendingReviews ?? 0) + (systemAlerts.failedPayments ?? 0);

  const studentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: platformNotifications.unreadCount },
    { href: "/dashboard/quiz-shop", label: "Quiz Shop", icon: ShoppingBag },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/achievements", label: "Achievements", icon: Medal },
    { href: "/certificates", label: "Certificates", icon: Award },
    { href: "/support", label: "Support", icon: LifeBuoy },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  // Each admin link is gated by the backend-granted permission that its page needs.
  const canAdmin = (permission: string) =>
    !user?.permissions?.length || user.permissions.includes(permission);

  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Shield, permission: "dashboard:view" },
    { href: "/admin/admins", label: "Admin team", icon: Shield, permission: "admins:view" },
    { href: "/admin/broadcast-notifications", label: "Broadcasts", icon: BellRing, permission: "notifications:broadcast" },
    { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: adminNotificationBadge, permission: "notifications:view" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:view" },
    { href: "/admin/reviews", label: "Pending reviews", icon: ClipboardCheck, permission: "courses:approve" },
    { href: "/admin/students", label: "Students", icon: Users, permission: "students:view" },
    { href: "/admin/teachers", label: "Create teacher", icon: UserPlus, permission: "teachers:create" },
    { href: "/admin/users", label: "Manage teachers", icon: Users, permission: "teachers:view" },
    { href: "/admin/courses", label: "Admin courses", icon: FolderKanban, permission: "courses:view" },
    { href: "/admin/owned-courses", label: "Admin-owned courses", icon: BookOpen, permission: "courses:create" },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments:view" },
    { href: "/admin/certificates", label: "Certificates", icon: Award, permission: "analytics:view" },
    { href: "/admin/support", label: "Support tickets", icon: LifeBuoy, permission: "support:view" },
    { href: "/admin/activity-logs", label: "Activity logs", icon: Waves, permission: "activity-logs:view" },
    { href: "/admin/settings", label: "Settings", icon: Settings, permission: "admin-settings:view" },
  ].filter((link) => canAdmin(link.permission));

  const teacherLinks = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/courses", label: "My courses", icon: BookOpen },
    { href: "/teacher/create-course", label: "Create course", icon: Upload },
    { href: "/teacher/uploads", label: "Current uploads", icon: FolderKanban },
    { href: "/teacher/students", label: "Students", icon: Users },
    { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/teacher/announcements", label: "Announcements", icon: BellRing },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: platformNotifications.unreadCount },
    { href: "/teacher/support", label: "Support", icon: LifeBuoy },
    { href: "/teacher/settings", label: "Settings", icon: Settings },
  ];

  const navGroups =
    role === "admin"
      ? [{ title: getRoleLabel(user), items: adminLinks }]
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
            // size="sm"
            // subtitle={`${role.charAt(0).toUpperCase()}${role.slice(1)} workspace`}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-sidebar-foreground/55">
                {group.title}
              </div>
              <nav className="mt-2 space-y-1">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active =
                    pathname === href ||
                    (href === "/dashboard/courses" && pathname?.startsWith("/course")) ||
                    (href === "/dashboard/payments" &&
                      (pathname === "/dashboard/payments" || pathname?.startsWith("/payment/"))) ||
                    pathname?.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4.5 w-4.5" />
                        {label}
                      </span>
                      {typeof badge === "number" && badge > 0 ? (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {badge}
                        </span>
                      ) : null}
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
