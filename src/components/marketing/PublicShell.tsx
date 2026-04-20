"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui-kit/Button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
  { href: "/quiz-shop", label: "Quiz Shop" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground shadow-lg shadow-primary/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">
                MooreSkillUp
              </div>
              <div className="text-xs text-muted-foreground">
                Learning Academy
              </div>
            </div>
          </Link>

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

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
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
              </div>
            </div>
          </div>
        )}
      </header>

      {children}

      {footer ?? (
        <footer className="border-t border-border/60 bg-card/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <div className="font-display text-lg font-bold">MooreSkillUp</div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Premium learning experiences for builders, designers, and modern product teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
