"use client";

import Link from "next/link";
import { CalendarCheck, ClipboardList, Clock } from "lucide-react";

import type { UpcomingWork } from "@/lib/student";

function dueLabel(days: number) {
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due in ${Math.ceil(days / 7)} week${days >= 14 ? "s" : ""}`;
}

/** Closer deadlines read as more urgent. */
function urgencyClass(days: number) {
  if (days <= 1) return "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20";
  if (days <= 3) return "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20";
  return "text-green-500 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20";
}

/**
 * Assignments with a due date still ahead, from courses the student is
 * enrolled in.
 *
 * Deliberately "what's due", not "what's outstanding" — submission happens
 * off-platform through WhatsApp and Google Forms by design, so the platform
 * genuinely cannot know whether a student has handed something in.
 */
export function UpcomingTasks({ tasks = [], loading }: { tasks?: UpcomingWork[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-display text-lg font-bold text-foreground">Coming up</h3>

      {!tasks.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-center">
          <CalendarCheck className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Nothing due right now</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Assignments with deadlines will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/course/${task.courseId}`}
              className="flex items-center gap-3.5 rounded-2xl border border-border bg-background p-3.5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${urgencyClass(task.daysUntilDue)}`}
              >
                <ClipboardList className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-bold text-foreground">
                  {task.title}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {dueLabel(task.daysUntilDue)} · {task.courseTitle}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
