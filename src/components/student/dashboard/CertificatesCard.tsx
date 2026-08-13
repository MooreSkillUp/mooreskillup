"use client";

import Link from "next/link";
import { Award, Lock } from "lucide-react";

/**
 * Certificates, on the dashboard.
 *
 * A certificate is the strongest motivator in the product — the thing a student
 * is working toward and the only thing they will actually show someone. It had
 * a number in the banner and nothing else. This gives it a presence: what you
 * have earned, and how close the next one is.
 */
export function CertificatesCard({
  earned,
  inProgress,
  loading,
}: {
  earned: number;
  /** Closest-first: certificate-enabled courses not yet finished. */
  inProgress: { id: string; title: string; progressPercent: number }[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-muted" />
      </section>
    );
  }

  // Nothing earned and nothing on the way: the sidebar link is enough, and an
  // empty card here would just be another thing saying "you have none".
  if (earned === 0 && inProgress.length === 0) return null;

  const next = inProgress[0];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Certificates</h2>
        <Link
          href="/certificates"
          className="text-xs font-semibold text-primary transition-colors hover:text-accent"
        >
          View all
        </Link>
      </div>

      {earned > 0 && (
        <Link
          href="/certificates"
          className="mt-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3 transition-colors hover:bg-success/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <Award className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold leading-none">{earned}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {earned === 1 ? "certificate earned" : "certificates earned"}
            </span>
          </span>
        </Link>
      )}

      {next && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Lock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Next certificate
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{next.title}</p>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, next.progressPercent))}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {Math.round(next.progressPercent)}% complete
          </p>
        </div>
      )}
    </section>
  );
}
