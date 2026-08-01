"use client";

import Link from "next/link";
import { Flame } from "lucide-react";

import type { ActivityDay } from "@/lib/student";
import { cn } from "@/lib/utils";

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Today's minutes against the student's target, the current streak, and the
 * week behind it — one card instead of three.
 *
 * These were separate widgets asking the same question ("am I keeping this
 * up?") in three places, which made the dashboard feel busier than it is.
 *
 * Every number is recorded server-side. A new student sees honest zeros, which
 * is why the empty copy has to encourage rather than just report nothing.
 */
export function TodayCard({
  targetMinutes = 30,
  earnedMinutes = 0,
  streakDays = 0,
  week = [],
  loading,
}: {
  targetMinutes?: number;
  earnedMinutes?: number;
  streakDays?: number;
  week?: ActivityDay[];
  loading?: boolean;
}) {
  const pct =
    targetMinutes > 0 ? Math.min(100, Math.round((earnedMinutes / targetMinutes) * 100)) : 0;
  const remaining = Math.max(0, targetMinutes - earnedMinutes);
  const busiest = Math.max(...week.map((day) => day.minutes), 1);
  const hasActivity = week.some((day) => day.minutes > 0);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-5 h-[104px] w-[104px] animate-pulse rounded-full bg-muted" />
        <div className="mt-5 h-12 animate-pulse rounded-xl bg-muted" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Today</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            streakDays > 0
              ? "bg-orange-500/10 text-orange-500"
              : "bg-muted text-muted-foreground",
          )}
          title={
            streakDays > 0
              ? `${streakDays} consecutive ${streakDays === 1 ? "day" : "days"} of learning`
              : "No streak yet"
          }
        >
          <Flame className="h-3.5 w-3.5" />
          {streakDays} {streakDays === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center">
        <div className="relative h-[104px] w-[104px]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="9"
              className="stroke-muted"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tabular-nums leading-none">
              {earnedMinutes}
            </span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">of {targetMinutes} min</span>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {pct >= 100
            ? "Goal reached today. Nicely done."
            : earnedMinutes === 0
              ? "Open a lesson to start today's clock."
              : `${remaining} min to go.`}
        </p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-end justify-between gap-1.5">
          {week.map((day) => {
            const date = new Date(day.date);
            const height = day.minutes > 0 ? Math.max(14, (day.minutes / busiest) * 36) : 6;
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  title={`${day.minutes} min`}
                  style={{ height: `${height}px` }}
                  className={cn(
                    "w-full rounded-full transition-all duration-500",
                    day.isToday && day.minutes > 0
                      ? "bg-accent"
                      : day.minutes > 0
                        ? "bg-accent/35"
                        : "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    day.isToday ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {DAY_INITIALS[date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {!hasActivity ? (
            <>
              Finish a lesson to start your streak.{" "}
              <Link href="/settings" className="font-semibold text-primary hover:text-accent">
                Change goal
              </Link>
            </>
          ) : (
            <>
              Last 7 days ·{" "}
              <Link href="/settings" className="font-semibold text-primary hover:text-accent">
                Change goal
              </Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
