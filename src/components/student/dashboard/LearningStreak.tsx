"use client";

import { Flame } from "lucide-react";

import type { ActivityDay } from "@/lib/student";

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Consecutive days of learning, and the last seven days as bars.
 *
 * Every bar reflects minutes the server actually recorded — this used to render
 * a fixed 7-day streak for every student, including one who had never opened a
 * lesson.
 */
export function LearningStreak({
  streakDays = 0,
  week = [],
  loading,
}: {
  streakDays?: number;
  week?: ActivityDay[];
  loading?: boolean;
}) {
  const hasActivity = week.some((day) => day.minutes > 0);
  const busiest = Math.max(...week.map((day) => day.minutes), 1);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-16 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Learning streak</h3>
        <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 dark:bg-orange-500/10">
          <Flame className={`h-4 w-4 ${streakDays > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          <span
            className={`text-xs font-bold ${streakDays > 0 ? "text-orange-500" : "text-muted-foreground"}`}
          >
            {streakDays} {streakDays === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1.5">
        {week.map((day) => {
          const date = new Date(day.date);
          const height = day.minutes > 0 ? Math.max(20, (day.minutes / busiest) * 40) : 8;
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                title={`${day.minutes} min`}
                style={{ height: `${height}px` }}
                className={`w-full rounded-full transition-all duration-300 ${
                  day.isToday && day.minutes > 0
                    ? "bg-orange-500 shadow-lg shadow-orange-500/30"
                    : day.minutes > 0
                      ? "bg-orange-200 dark:bg-orange-500/30"
                      : "bg-muted/60"
                }`}
              />
              <span
                className={`text-[10px] font-medium uppercase ${
                  day.isToday ? "text-orange-500" : "text-muted-foreground"
                }`}
              >
                {DAY_INITIALS[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {!hasActivity
          ? "Finish a lesson today to start your streak."
          : streakDays >= 7
            ? "A full week running — keep it going 🔥"
            : streakDays > 1
              ? `${streakDays} days in a row. Nice work.`
              : "You're on the board. Come back tomorrow to build it up."}
      </p>
    </div>
  );
}
