"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui-kit/Button";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
};

const links: NavLink[] = [];

export function PublicShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const dashboardHref = getHomeRouteForUser(user);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />

          {links.length > 0 && (
            <nav className="hidden items-center gap-1 lg:flex">
              {links.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="hidden items-center gap-4 lg:flex">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link href={dashboardHref}>
                <Button variant="accent" size="sm">
                  Open dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="accent" size="sm">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((value) => !value)}
            className="inline-flex rounded-xl border border-border bg-card p-2 text-foreground lg:hidden"
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-card/95 px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <ThemeToggle className="flex-1 justify-center" />
                {isAuthenticated ? (
                  <Link href={dashboardHref} className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="accent" className="w-full">
                      Open dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/login" className="flex-1" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link href="/auth/register" className="flex-1" onClick={() => setOpen(false)}>
                      <Button variant="accent" className="w-full">
                        Sign up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {children}
    </div>
  );
}
