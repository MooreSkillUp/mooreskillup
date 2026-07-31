"use client";

import Link from "next/link";

/**
 * Today's recorded minutes against the student's own target.
 *
 * Both numbers are real: minutes come from time the server banked while a
 * lesson was open, and the target is set by the student in Settings. This used
 * to show a fixed 18-of-30 to everybody.
 */
export function DailyGoal({
  targetMinutes = 30,
  earnedMinutes = 0,
  loading,
}: {
  targetMinutes?: number;
  earnedMinutes?: number;
  loading?: boolean;
}) {
  const pct = targetMinutes > 0 ? Math.min(100, Math.round((earnedMinutes / targetMinutes) * 100)) : 0;
  const remaining = Math.max(0, targetMinutes - earnedMinutes);

  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-6 h-[120px] w-[120px] animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Today&apos;s goal</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {pct}%
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#F97316"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-foreground">{earnedMinutes}m</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              of {targetMinutes}m
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {pct >= 100
              ? "🎉 Goal complete"
              : earnedMinutes === 0
                ? "Not started today"
                : `${remaining} min to go`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pct >= 100 ? (
              "You hit your target today."
            ) : (
              <>
                Aiming for {targetMinutes} min a day.{" "}
                <Link href="/settings" className="font-medium text-primary hover:underline">
                  Change
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
