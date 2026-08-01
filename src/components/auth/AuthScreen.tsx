"use client";

import type { ReactNode } from "react";
import { AlertCircle, Info } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

/**
 * One shape for every auth screen — sign in, register, verify, forgot and reset.
 *
 * Before this each page invented its own layout, so moving between them felt
 * like moving between different products. It also carries the pieces every one
 * of them needs and none of them had: a single place for errors, safe-area
 * insets for the installed PWA, and a way back to the front door.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  error,
  notice,
  width = "md",
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Something went wrong — shown in red, above the form. */
  error?: string;
  /** Neutral context, e.g. "you were signed out" — shown in amber. */
  notice?: string;
  width?: "md" | "lg";
}) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-background text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <BrandLogo href="/" size="sm" priority />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-12 pt-4 sm:items-center sm:px-8 sm:pt-0">
        <div
          className={`w-full ${
            width === "lg" ? "max-w-2xl" : "max-w-md"
          } animate-in fade-in slide-in-from-bottom-3 duration-300`}
        >
          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            )}

            {notice && (
              <div
                role="status"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
