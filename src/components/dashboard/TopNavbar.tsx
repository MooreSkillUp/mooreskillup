"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Bell, Heart, Menu, Moon, Search, Sun } from "lucide-react";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { notifications } from "@/lib/mock-data";
import { useTheme } from "@/lib/theme";

export function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const role = user?.role ?? "student";
  const wishlistCount = user?.wishlist.length ?? 0;
  const dashboardLabel = role === "student" ? "Search your courses, roadmap, or rewards" : "Search your workspace";
  const quickHref = role === "student" ? "/dashboard/courses?view=saved" : getHomeRouteForUser(user);
  const quickLabel = role === "student" ? "Wishlist" : "Workspace";
  const visibleNotifications = useMemo(
    () => notifications.slice(0, 3),
    [],
  );

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
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            {dashboardLabel}
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
          <Link
            href={quickHref}
            className="relative rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            aria-label={quickLabel}
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && role === "student" && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
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
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {visibleNotifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background p-3">
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="ml-1 flex items-center gap-3 rounded-2xl border border-border bg-card px-2.5 py-1.5">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
                {user?.avatar}
              </div>
            )}
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-medium">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {user?.plan ?? "free"} | {user?.role ?? "student"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
