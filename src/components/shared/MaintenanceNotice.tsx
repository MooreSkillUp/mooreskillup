"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { usePlatformStatus } from "@/lib/feature-flags";
import { useAuth } from "@/lib/auth";

/**
 * What maintenance mode looks like to the people it affects.
 *
 * The switch has always worked — the API refuses everyone but admins, with the
 * message the Super Admin wrote. Nothing displayed that message, so students
 * and teachers got a screen of failed requests and no idea why, while the
 * carefully worded explanation sat in the database.
 *
 * Admins keep working, and get a reminder instead: leaving maintenance on by
 * accident locks out the whole platform, and it's invisible from the inside.
 */
export function MaintenanceNotice({ children }: { children: React.ReactNode }) {
  const { status, isLoading } = usePlatformStatus();
  const { user } = useAuth();

  if (isLoading || !status.maintenanceMode) return <>{children}</>;

  if (user?.role === "admin") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2.5 text-sm lg:px-8">
          <Wrench className="h-4 w-4 shrink-0" />
          <span>
            <strong>Maintenance mode is on.</strong> Students and teachers can&apos;t use{" "}
            {status.siteName} — only admins.
          </span>
          <Link href="/admin/settings" className="font-semibold text-primary underline">
            Turn it off
          </Link>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">{status.siteName} is having a rest</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status.maintenanceMessage ||
            "We're doing some maintenance. Please check back shortly."}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Your progress is safe. Nothing you&apos;ve done has been lost.
        </p>
      </div>
    </div>
  );
}
