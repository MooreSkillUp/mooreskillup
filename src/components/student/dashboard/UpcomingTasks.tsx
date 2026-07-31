"use client";

import { ClipboardList, BookOpen, Clock } from "lucide-react";

interface Task {
  title: string;
  type: "Quiz" | "Assignment" | "Live Session";
  dueText: string;
  colorClass: string;
  icon: typeof ClipboardList;
}

export function UpcomingTasks() {
  const tasks: Task[] = [
    {
      title: "HTML Fundamentals Quiz",
      type: "Quiz",
      dueText: "Due in 2 days",
      icon: BookOpen,
      colorClass: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    },
    {
      title: "CSS Flexbox Assignment",
      type: "Assignment",
      icon: ClipboardList,
      dueText: "Due in 5 days",
      colorClass: "text-green-500 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20",
    },
    {
      title: "JavaScript Basics Quiz",
      type: "Quiz",
      icon: BookOpen,
      dueText: "Due in 7 days",
      colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-foreground">Upcoming Tasks</h3>
        <span className="text-xs font-semibold text-primary cursor-pointer hover:underline">View all</span>
      </div>

      <div className="space-y-3">
        {tasks.map((task, i) => {
          const Icon = task.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-2xl border border-border bg-background p-3.5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${task.colorClass}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold text-foreground truncate">{task.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{task.dueText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
