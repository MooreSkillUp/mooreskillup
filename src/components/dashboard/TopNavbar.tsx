"use client";

import Link from "next/link";
import { Bell, Menu, Moon, Search, Sun, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { notifications } from "@/lib/mock-data";
import { useTheme } from "@/lib/theme";

export function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const unreadCount = notifications.filter((item) => !item.read).length;

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
            Search courses, tracks, or rewards
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
            href="/courses"
            className="rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <button
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
          <div className="ml-1 flex items-center gap-3 rounded-2xl border border-border bg-card px-2.5 py-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
              {user?.avatar}
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-medium">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {user?.plan ?? "free"} · {user?.role ?? "student"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
