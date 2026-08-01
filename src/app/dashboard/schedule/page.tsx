"use client";

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

import { AppShell } from "@/components/dashboard/AppShell";
import { useAuth } from "@/lib/auth";
import {
  EVENT_KIND_LABELS,
  friendlyDay,
  timeOfDay,
  useStudentSchedule,
  type ScheduleEvent,
} from "@/lib/schedule";

const KIND_ICONS: Record<string, LucideIcon> = {
  live_class: Video,
  q_and_a: MessagesSquare,
  workshop: GraduationCap,
  launch: Rocket,
  deadline: ClipboardList,
  other: CalendarClock,
};

/** Group by day so the page reads as a calendar rather than a flat list. */
function groupByDay(events: ScheduleEvent[]) {
  const groups = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const key = new Date(event.startsAt).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()];
}

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const { events, isLoading } = useStudentSchedule(user?.role === "student");
  const days = groupByDay(events);

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live classes, Q&amp;A sessions and workshops from your courses, over the next 90 days.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">Nothing scheduled</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              When a teacher schedules a live class or Q&amp;A for one of your courses, it&apos;ll
              appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map(([day, dayEvents]) => (
              <section key={day}>
                <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">
                  {friendlyDay(dayEvents[0].startsAt)}
                  <span className="ml-2 font-normal">
                    {new Date(day).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </h2>

                <ul className="space-y-2.5">
                  {dayEvents.map((event) => {
                    const Icon = KIND_ICONS[event.kind] ?? CalendarClock;
                    return (
                      <li
                        key={event.id}
                        className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                          <Icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{event.title}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {EVENT_KIND_LABELS[event.kind] ?? event.kind}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {timeOfDay(event.startsAt)}
                            {event.endsAt ? ` – ${timeOfDay(event.endsAt)}` : ""}
                            {event.courseTitle ? ` · ${event.courseTitle}` : " · Everyone"}
                          </p>

                          {event.description && (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {event.description}
                            </p>
                          )}

                          {(event.joinUrl || event.location) && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-3">
                              {event.joinUrl && (
                                <a
                                  href={event.joinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                                >
                                  Join
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {event.location && (
                                <span className="text-xs text-muted-foreground">
                                  {event.location}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
