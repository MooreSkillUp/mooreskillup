"use client";

import { Award, BookOpen, CheckCircle, Clock } from "lucide-react";

import type { StudentActivity } from "@/lib/student";

/** 95 -> "1h 35m", 40 -> "40m", 0 -> "0m". */
function formatMinutes(total: number) {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function StatsGrid({
  stats,
  activity,
  loading,
}: {
  stats?: { enrolled: number; inProgress: number; completed: number; certificates: number };
  activity?: StudentActivity;
  loading?: boolean;
}) {
  const cards = [
    {
      label: "Courses enrolled",
      value: stats?.enrolled ?? 0,
      icon: BookOpen,
      colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    },
    {
      label: "Courses completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      colorClass: "text-green-500 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20",
    },
    {
      // Real recorded time. This was previously invented as `inProgress * 2 + 3`
      // because nothing in the codebase ever wrote to time_spent_seconds.
      label: "Time learning",
      value: formatMinutes(activity?.totalMinutes ?? 0),
      icon: Clock,
      colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    },
    {
      label: "Certificates",
      value: stats?.certificates ?? 0,
      icon: Award,
      colorClass: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-display text-lg font-bold text-foreground">Your progress</h3>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-[1.25rem] border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.colorClass}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
                {loading ? (
                  <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted" />
                ) : (
                  card.value
                )}
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">{card.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
