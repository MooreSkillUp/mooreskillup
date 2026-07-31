"use client";

import { Flame } from "lucide-react";

interface LearningStreakProps {
  streakDays?: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function LearningStreak({ streakDays = 7 }: LearningStreakProps) {
  // Mark the last `streakDays` days as active (simplified for UI purposes)
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  // Re-order days so today is last
  const reordered = [...DAYS.slice(today === 0 ? 0 : today), ...DAYS.slice(0, today === 0 ? 0 : today)].slice(-7);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Learning Streak</h3>
        <div className="flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-500">{streakDays} Days</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1">
        {DAYS.map((day, i) => {
          const isActive = i < streakDays;
          const isToday = i === streakDays - 1;
          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-full transition-all duration-300 ${
                  isToday
                    ? "h-10 bg-orange-500 shadow-lg shadow-orange-500/30"
                    : isActive
                    ? "h-8 bg-orange-200 dark:bg-orange-500/30"
                    : "h-5 bg-muted/60"
                }`}
              />
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  isToday
                    ? "text-orange-500"
                    : isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        You&apos;ve been learning every day this week 🎯
      </p>
    </div>
  );
}
