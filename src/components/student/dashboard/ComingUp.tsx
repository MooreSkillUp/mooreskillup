"use client";

import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  MessagesSquare,
  Rocket,
  Video,
  type LucideIcon,
} from "lucide-react";
import { isImminent, whenLabel, type UpcomingItem } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<string, LucideIcon> = {
  live_class: Video,
  q_and_a: MessagesSquare,
  workshop: GraduationCap,
  launch: Rocket,
  deadline: ClipboardList,
  other: CalendarClock,
};

/**
 * What's coming — live sessions, workshops and assignment deadlines in one list.
 *
 * This replaces a widget that rendered three hardcoded assignments. Everything
 * here is real: events scheduled by a teacher or admin, and assignments with an
 * actual due date on a course the student is enrolled in.
 */
export function ComingUp({
  items,
  isLoading,
}: {
  items: UpcomingItem[];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Coming up</h2>
        <Link
          href="/dashboard/schedule"
          className="text-xs font-semibold text-primary transition-colors hover:text-accent"
        >
          Full schedule
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-medium">Nothing scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Live sessions and assignment deadlines from your courses will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const Icon = KIND_ICONS[item.kind] ?? CalendarClock;
            const soon = !item.allDay && isImminent(item.at);

            return (
              <li key={`${item.type}-${item.id}`}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                    soon ? "border-accent/40 bg-accent/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      item.type === "assignment"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {soon && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                          Soon
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {whenLabel(item.at, item.allDay)}
                      {item.courseTitle ? ` · ${item.courseTitle}` : " · Everyone"}
                    </p>

                    {item.joinUrl && (
                      <a
                        href={item.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-accent"
                      >
                        {item.type === "assignment" ? "Open submission" : "Join"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
