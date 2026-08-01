"use client";

import { Award, BookOpen, CheckCircle2, Clock } from "lucide-react";

/** 95 -> "1h 35m", 40 -> "40m", 0 -> "0m". */
function formatMinutes(total: number) {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The first thing a student sees: who they are, and where they stand.
 *
 * Replaces a separate four-card stat grid. The numbers matter, but they aren't
 * the point of the screen — folding them into the greeting keeps the top of the
 * page to one object instead of five, so Continue Learning stays the loudest
 * thing on the page.
 */
export function WelcomeBanner({
  name,
  streakDays = 0,
  enrolled = 0,
  completed = 0,
  totalMinutes = 0,
  certificates = 0,
  loading,
}: {
  name?: string;
  streakDays?: number;
  enrolled?: number;
  completed?: number;
  totalMinutes?: number;
  certificates?: number;
  loading?: boolean;
}) {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "there";

  const subtitle = loading
    ? ""
    : streakDays >= 2
      ? `You're on a ${streakDays}-day streak. Keep it running.`
      : enrolled === 0
        ? "Pick a course and let's get you started."
        : totalMinutes === 0
          ? "Open a lesson to start tracking your time."
          : "Pick up where you left off.";

  const stats = [
    { label: "Enrolled", value: String(enrolled), icon: BookOpen },
    { label: "Completed", value: String(completed), icon: CheckCircle2 },
    { label: "Time learning", value: formatMinutes(totalMinutes), icon: Clock },
    { label: "Certificates", value: String(certificates), icon: Award },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* A wash rather than a solid fill, so the card reads as part of the page
          instead of an advertisement sitting on top of it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,var(--color-accent)/12%,transparent_55%),radial-gradient(circle_at_100%_0%,var(--color-primary)/10%,transparent_50%)]"
      />

      <div className="relative p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}

        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 backdrop-blur-sm"
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </dt>
              <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
                {loading ? <span className="inline-block h-5 w-10 animate-pulse rounded bg-muted" /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
