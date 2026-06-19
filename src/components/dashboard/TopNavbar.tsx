"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, ChevronRight, Heart, Menu, Moon, Sun } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { getHomeRouteForUser, getRoleLabel, getWorkspaceLabel, useAuth } from "@/lib/auth";
import { useAdminPlatform } from "@/lib/admin-platform";
import { usePlatformNotifications } from "@/lib/platform-notifications";
import { useTheme } from "@/lib/theme";

export function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const role = user?.role ?? "student";
  const adminPlatform = useAdminPlatform({ enabled: role === "admin" });
  const platformNotifications = usePlatformNotifications(role !== "admin" && !!user);
  const wishlistCount = user?.wishlist.length ?? 0;
  const quickHref = role === "student" ? "/courses?view=saved" : getHomeRouteForUser(user);
  const quickLabel = role === "student" ? "Wishlist" : "Workspace";

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

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-2xl p-2 hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground md:block">
            {getWorkspaceLabel(user)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {role === "student" && (
            <Link
              href={quickHref}
              className="relative rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
              aria-label={quickLabel}
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>
          )}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((value) => !value)}
              className="relative rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-14 w-80 rounded-3xl border border-border bg-card p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-bold">Notifications</div>
                  <div className="flex items-center gap-3">
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
                        className="text-sm font-semibold text-primary hover:text-accent"
                      >
                        {role === "admin" ? "Clear history" : "Mark all as read"}
                      </button>
                    )}
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {visibleNotifications.length ? (
                    visibleNotifications.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{item.title}</div>
                            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</div>
                          </div>
                          {role !== "admin" && !item.id.startsWith("review-") && (
                            <button
                              type="button"
                              onClick={() => void platformNotifications.markAsRead(item.id)}
                              className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
                            >
                              Read
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-primary">
                          <span>{item.sender}</span>
                          <span>
                            {new Date(item.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                      No notifications right now.
                    </div>
                  )}
                </div>
                <Link
                  href={notificationsHref}
                  onClick={() => setNotificationsOpen(false)}
                  className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold text-primary transition hover:border-primary/30"
                >
                  <span>View all notifications</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
          <div className="ml-1 flex items-center gap-3 rounded-2xl border border-border bg-card px-2.5 py-1.5">
            <UserAvatar
              avatarId={user?.avatarUrl}
              initials={user?.avatar}
              role={user?.role}
              adminRole={user?.adminRole}
              size={36}
            />
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-medium">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {getRoleLabel(user)} · {(user?.status ?? "active") === "active" ? "Active" : "Disabled"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
