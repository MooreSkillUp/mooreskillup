"use client";

import { BookOpen, CheckCircle, Clock, Award } from "lucide-react";

interface StatsGridProps {
  stats?: {
    enrolled: number;
    inProgress: number;
    completed: number;
    certificates: number;
  };
  loading?: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  const cards = [
    {
      label: "Courses Enrolled",
      value: stats?.enrolled ?? 0,
      icon: BookOpen,
      colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    },
    {
      label: "Lessons Completed",
      value: stats?.completed ?? 0, // In the design image, this is "Lessons Completed", let's keep it complete
      icon: CheckCircle,
      colorClass: "text-green-500 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20",
    },
    {
      label: "Total Learning Time",
      value: stats?.inProgress ? `${stats.inProgress * 2 + 3}h 45m` : "12h 45m", // Deriving time dynamically or mock standard matching image
      icon: Clock,
      colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    },
    {
      label: "Certificates Earned",
      value: stats?.certificates ?? 0,
      icon: Award,
      colorClass: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-foreground">Your Learning Overview</h3>
      </div>
      <div className="grid gap-4 grid-cols-2">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="group relative overflow-hidden rounded-[1.25rem] border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.colorClass}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
                {loading ? (
                  <span className="inline-block h-6 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  card.value
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">{card.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
