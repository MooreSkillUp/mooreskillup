"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileEdit, Globe } from "lucide-react";

import { cn } from "@/lib/utils";

type Stage = {
  key: string;
  label: string;
  count: number;
  icon: typeof FileEdit;
  hint: string;
  tone: "neutral" | "waiting" | "live" | "problem";
};

const TONE: Record<Stage["tone"], string> = {
  neutral: "bg-muted text-muted-foreground",
  waiting: "bg-warning/15 text-warning",
  live: "bg-success/15 text-success",
  problem: "bg-destructive/15 text-destructive",
};

/**
 * Where every course stands, as the one path it actually travels.
 *
 * This replaces eight separate stat cards. They repeated themselves — Total,
 * Published and Active were the same number for any teacher with nothing
 * archived — and said nothing about sequence, so a teacher could not tell that
 * "approved" comes before "published" or that a declined course is waiting on
 * them. Laid out in order, the counts explain the process for free, which is
 * most of what a teacher needs on their first week.
 *
 * Each stage links to that tab, so a count is somewhere to go rather than a
 * number to look at.
 */
export function CoursePipeline({
  draft,
  review,
  approved,
  published,
  declined,
  loading,
}: {
  draft: number;
  review: number;
  approved: number;
  published: number;
  declined: number;
  loading?: boolean;
}) {
  const stages: Stage[] = [
    {
      key: "draft",
      label: "Drafts",
      count: draft,
      icon: FileEdit,
      hint: "Yours to edit. Auto-saves as you write.",
      tone: "neutral",
    },
    {
      key: "review",
      label: "In review",
      count: review,
      icon: Clock3,
      hint: "With the review team. No action needed.",
      tone: review > 0 ? "waiting" : "neutral",
    },
    {
      key: "approved",
      label: "Approved",
      count: approved,
      icon: CheckCircle2,
      hint: "Cleared for release.",
      tone: approved > 0 ? "live" : "neutral",
    },
    {
      key: "published",
      label: "Live",
      count: published,
      icon: Globe,
      hint: "Students can enroll right now.",
      tone: published > 0 ? "live" : "neutral",
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Course pipeline</h2>
        <Link
          href="/teacher/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          All courses <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {declined > 0 && (
        <Link
          href="/teacher/courses?status=declined"
          className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm transition-colors hover:bg-destructive/15"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            <span className="font-semibold text-destructive">
              {declined} course{declined === 1 ? "" : "s"} sent back
            </span>
            <span className="ml-1 text-muted-foreground">
              — open it to read the reviewer&apos;s notes and resubmit.
            </span>
          </span>
        </Link>
      )}

      <ol className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map(({ key, label, count, icon: Icon, hint, tone }) => (
          <li key={key}>
            <Link
              href={`/teacher/courses?status=${key}`}
              className={cn(
                "flex h-full flex-col rounded-xl border p-3.5 transition-colors",
                count > 0
                  ? "border-border bg-background hover:border-accent/50"
                  : "border-dashed border-border bg-background/40 hover:border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  count > 0 ? TONE[tone] : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 font-display text-2xl font-bold tabular-nums">
                {loading ? (
                  <span className="inline-block h-7 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  count
                )}
              </span>
              <span className="text-sm font-medium">{label}</span>
              <span className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
