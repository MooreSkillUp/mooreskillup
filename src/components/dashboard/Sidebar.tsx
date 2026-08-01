"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  CalendarClock,
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
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAdminPlatform } from "@/lib/admin-platform";
import { useFeatureFlags } from "@/lib/feature-flags";
import { usePlatformNotifications } from "@/lib/platform-notifications";
import { hasUserPermission } from "@/lib/admin-rbac";
import { activeNavHref } from "@/lib/nav-active";
import { getHomeRouteForUser, getRoleLabel, useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const homeHref = getHomeRouteForUser(user);
  const role = user?.role ?? "student";
  const platformNotifications = usePlatformNotifications(role !== "admin" && !!user);
  const { flags } = useFeatureFlags();
  const { systemAlerts } = useAdminPlatform({ enabled: role === "admin" && !!user });
  const adminNotificationBadge =
    (systemAlerts.pendingReviews ?? 0) + (systemAlerts.failedPayments ?? 0);

  // Grouped so a ten-item list reads as three short ones. Quiz Shop, Leaderboard
  // and Achievements have no backend yet and appear only when a Super Admin
  // turns the matching flag on — otherwise they are dead ends and the toggles do
  // nothing.
  const studentGroups: NavGroup[] = [
    {
      title: "Learn",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
        { href: "/dashboard/schedule", label: "Schedule", icon: CalendarClock },
        ...(flags.certificates
          ? [{ href: "/certificates", label: "Certificates", icon: Award }]
          : []),
      ],
    },
    {
      title: "Progress",
      items: [
        ...(flags.leaderboard ? [{ href: "/leaderboard", label: "Leaderboard", icon: Trophy }] : []),
        ...(flags.achievements
          ? [{ href: "/achievements", label: "Achievements", icon: Medal }]
          : []),
        ...(flags.quiz
          ? [{ href: "/dashboard/quiz-shop", label: "Quiz Shop", icon: ShoppingBag }]
          : []),
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: "/notifications",
          label: "Notifications",
          icon: Bell,
          badge: platformNotifications.unreadCount,
        },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
        { href: "/support", label: "Support", icon: LifeBuoy },
        { href: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ].filter((group) => group.items.length > 0);

  // Each admin link is gated by the backend-granted permission that its page needs.
  const canAdmin = (permission: string) =>
    hasUserPermission(user?.permissions, permission as Parameters<typeof hasUserPermission>[1]);

  const adminGroups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin/dashboard", label: "Dashboard", icon: Shield, permission: "dashboard:view" },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:view" },
        {
          href: "/admin/notifications",
          label: "Notifications",
          icon: Bell,
          badge: adminNotificationBadge,
          permission: "notifications:view",
        },
        {
          href: "/admin/broadcast-notifications",
          label: "Broadcasts",
          icon: BellRing,
          permission: "notifications:broadcast",
        },
      ],
    },
    {
      title: "Learning",
      items: [
        { href: "/admin/courses", label: "Courses", icon: FolderKanban, permission: "courses:view" },
        {
          href: "/admin/owned-courses",
          label: "Admin-owned",
          icon: BookOpen,
          permission: "courses:create",
        },
        {
          href: "/admin/reviews",
          label: "Pending reviews",
          icon: ClipboardCheck,
          permission: "courses:approve",
        },
        { href: "/admin/schedule", label: "Schedule", icon: CalendarClock, permission: "courses:view" },
        {
          href: "/admin/certificates",
          label: "Certificates",
          icon: Award,
          permission: "analytics:view",
        },
      ],
    },
    {
      title: "People",
      items: [
        { href: "/admin/students", label: "Students", icon: Users, permission: "students:view" },
        { href: "/admin/users", label: "Manage teachers", icon: Users, permission: "teachers:view" },
        {
          href: "/admin/teachers",
          label: "Create teacher",
          icon: UserPlus,
          permission: "teachers:create",
        },
        { href: "/admin/admins", label: "Admin team", icon: Shield, permission: "admins:view" },
      ],
    },
    {
      title: "Operations",
      items: [
        { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments:view" },
        { href: "/admin/support", label: "Support", icon: LifeBuoy, permission: "support:view" },
        {
          href: "/admin/activity-logs",
          label: "Activity logs",
          icon: Waves,
          permission: "activity-logs:view",
        },
        { href: "/admin/settings", label: "Settings", icon: Settings, permission: "admin-settings:view" },
      ],
    },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => canAdmin(item.permission)) }))
    .filter((group) => group.items.length > 0);

  const teacherGroups: NavGroup[] = [
    {
      title: "Teaching",
      items: [
        { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/teacher/courses", label: "My courses", icon: BookOpen },
        { href: "/teacher/create-course", label: "Create course", icon: Upload },
        { href: "/teacher/schedule", label: "Schedule", icon: CalendarClock },
      ],
    },
    {
      title: "Students",
      items: [
        { href: "/teacher/students", label: "Students", icon: Users },
        { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/teacher/announcements", label: "Announcements", icon: BellRing },
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: "/notifications",
          label: "Notifications",
          icon: Bell,
          badge: platformNotifications.unreadCount,
        },
        { href: "/teacher/support", label: "Support", icon: LifeBuoy },
        { href: "/teacher/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const navGroups =
    role === "admin" ? adminGroups : role === "teacher" ? teacherGroups : studentGroups;

  // Every href competes and the most specific wins, so exactly one item lights
  // up. Testing each item independently used to make /dashboard/courses activate
  // both "Dashboard" and "Courses". See lib/nav-active.
  const activeHref = activeNavHref(
    pathname,
    navGroups.flatMap((group) => group.items.map((item) => item.href)),
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        id="tour-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <BrandLogo href={homeHref} />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = href === activeHref;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                          : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      {/* A rail rather than a filled block: the label stays legible
                          and the accent isn't competing with the icon. */}
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-accent" />
                      )}
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            active
                              ? "text-accent"
                              : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80",
                          )}
                        />
                        <span className="truncate">{label}</span>
                      </span>
                      {typeof badge === "number" && badge > 0 ? (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="shrink-0 border-t border-sidebar-border p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2">
            <UserAvatar
              avatarId={user?.avatarUrl}
              initials={user?.avatar}
              role={user?.role}
              adminRole={user?.adminRole}
              size={34}
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{user?.displayName}</div>
              <div className="truncate text-xs text-sidebar-foreground/55">{getRoleLabel(user)}</div>
            </div>
          </div>
          <button
            onClick={() => {
              void logout();
              onClose();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
