"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  ChevronDown,
  CreditCard,
  Heart,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Dropdown } from "@/components/shared/Dropdown";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { getHomeRouteForUser, getRoleLabel, getWorkspaceLabel, useAuth } from "@/lib/auth";
import { useAdminPlatform } from "@/lib/admin-platform";
import { usePlatformNotifications } from "@/lib/platform-notifications";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Relative time that stays readable without pulling in a date library. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = user?.role ?? "student";
  const adminPlatform = useAdminPlatform({ enabled: role === "admin" });
  const platformNotifications = usePlatformNotifications(role !== "admin" && !!user);
  const wishlistCount = user?.wishlist.length ?? 0;

  // This used to point at /courses?view=saved — a route deleted during an
  // earlier cleanup — so the heart 404'd on every student page while the save
  // buttons kept working. Saved courses live on the Courses page now.
  const savedHref = "/dashboard/courses?tab=saved";

  const visibleNotifications = useMemo(() => {
    if (role !== "admin") {
      return platformNotifications.notifications.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
        sender: item.sender,
      }));
    }

    const reviewItems = adminPlatform.courses
      .filter((course) => course.status === "review")
      .slice(0, 3)
      .map((course) => ({
        id: `review-${course.id}`,
        title: "Course awaiting review",
        body: `${course.title} from ${course.teacherName} is waiting for admin approval.`,
        createdAt: new Date().toISOString(),
        sender: "Teacher workflow",
      }));

    const broadcastItems = adminPlatform.broadcasts.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.description,
      createdAt: item.sentAt ?? new Date().toISOString(),
      sender: "Admin broadcast",
    }));

    return [...reviewItems, ...broadcastItems].slice(0, 5);
  }, [adminPlatform.broadcasts, adminPlatform.courses, platformNotifications.notifications, role]);

  const unreadCount =
    role === "admin" ? visibleNotifications.length : platformNotifications.unreadCount;
  const notificationsHref = role === "admin" ? "/admin/notifications" : "/notifications";

  // Shortcuts to the things people actually leave the current page for.
  const profileLinks: { href: string; label: string; icon: LucideIcon }[] =
    role === "student"
      ? [
          { href: "/dashboard/courses", label: "My courses", icon: BookOpen },
          { href: "/certificates", label: "Certificates", icon: Award },
          { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
          { href: "/support", label: "Support", icon: LifeBuoy },
          { href: "/settings", label: "Settings", icon: Settings },
        ]
      : role === "teacher"
        ? [
            { href: "/teacher/courses", label: "My courses", icon: BookOpen },
            { href: "/teacher/support", label: "Support", icon: LifeBuoy },
            { href: "/teacher/settings", label: "Settings", icon: Settings },
          ]
        : [
            { href: "/admin/support", label: "Support tickets", icon: LifeBuoy },
            { href: "/admin/settings", label: "Settings", icon: Settings },
          ];

  const iconButton =
    "relative rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <header
      id="tour-header"
      className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden truncate text-sm font-medium text-muted-foreground md:block">
            {getWorkspaceLabel(user)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={toggle} className={iconButton} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {role === "student" && (
            <Link href={savedHref} className={iconButton} aria-label="Saved courses">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
          )}

          <div className="relative">
            <button
              data-dropdown-trigger
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setProfileOpen(false);
              }}
              className={iconButton}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <Dropdown
              open={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              className="w-[min(22rem,calc(100vw-2rem))]"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (role === "admin") {
                        void adminPlatform.clearBroadcastHistory();
                      } else {
                        void platformNotifications.markAllAsRead();
                      }
                      setNotificationsOpen(false);
                    }}
                    className="text-xs font-semibold text-primary transition-colors hover:text-accent"
                  >
                    {role === "admin" ? "Clear" : "Mark all read"}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {visibleNotifications.length ? (
                  visibleNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (role !== "admin" && !item.id.startsWith("review-")) {
                          void platformNotifications.markAsRead(item.id);
                        }
                        setNotificationsOpen(false);
                        router.push(notificationsHref);
                      }}
                      className="flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {item.sender} · {timeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">You&apos;re all caught up</p>
                  </div>
                )}
              </div>

              <Link
                href={notificationsHref}
                onClick={() => setNotificationsOpen(false)}
                className="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-muted/60"
              >
                View all notifications
              </Link>
            </Dropdown>
          </div>

          <div className="relative">
            <button
              data-dropdown-trigger
              onClick={() => {
                setProfileOpen((value) => !value);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pl-1.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
              aria-expanded={profileOpen}
            >
              <UserAvatar
                avatarId={user?.avatarUrl}
                initials={user?.avatar}
                role={user?.role}
                adminRole={user?.adminRole}
                size={30}
              />
              <span className="hidden max-w-28 truncate text-sm font-medium lg:block">
                {user?.displayName}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  profileOpen && "rotate-180",
                )}
              />
            </button>

            <Dropdown
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              className="w-60"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <UserAvatar
                  avatarId={user?.avatarUrl}
                  initials={user?.avatar}
                  role={user?.role}
                  adminRole={user?.adminRole}
                  size={38}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{user?.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                </div>
              </div>

              <div className="px-2 py-1.5">
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {getRoleLabel(user)}
                </div>
                {profileLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-border px-2 py-1.5">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    void logout();
                    router.push("/");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
