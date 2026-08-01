"use client";

import { useState } from "react";
import { CalendarClock, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import {
  EVENT_KIND_LABELS,
  friendlyDay,
  timeOfDay,
  useManagedEvents,
  type EventDraft,
  type ScheduleEvent,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { EventEditor } from "./EventEditor";

/**
 * The schedule screen for whoever can create events.
 *
 * Teacher and admin share it: same list, same editor, same rules. Admins get
 * the extra ability to address the whole platform, which the server verifies
 * independently of what this component renders.
 */
export function ScheduleManager({ scope }: { scope: "teacher" | "admin" }) {
  const { events, courses, isLoading, error, createEvent, updateEvent, deleteEvent } =
    useManagedEvents(scope);
  const { notifyError, notifySuccess } = useFeedback();

  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = scope === "admin";

  const save = async (draft: EventDraft) => {
    setBusy(true);
    try {
      if (editing) {
        await updateEvent(editing.id, draft);
        notifySuccess("Event updated", draft.title);
      } else {
        await createEvent(draft);
        notifySuccess("Event scheduled", draft.title);
      }
      setComposing(false);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (event: ScheduleEvent) => {
    try {
      await deleteEvent(event.id);
      notifySuccess("Event deleted", event.title);
    } catch (deleteError) {
      notifyError(
        "Could not delete",
        deleteError instanceof Error ? deleteError.message : "Please try again.",
      );
    }
  };

  const showEditor = composing || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live classes, Q&amp;A sessions and launches. Students see these on their dashboard.
          </p>
        </div>
        {!showEditor && (
          <Button
            variant="accent"
            onClick={() => {
              setEditing(null);
              setComposing(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New event
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showEditor && (
        <EventEditor
          courses={courses}
          canScheduleForEveryone={isAdmin}
          editing={editing}
          busy={busy}
          onSubmit={save}
          onCancel={() => {
            setComposing(false);
            setEditing(null);
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 font-medium">Nothing scheduled yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Schedule a live class or Q&amp;A and it appears on your students&apos; dashboards
            straight away.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const past = new Date(event.startsAt).getTime() < Date.now();
            return (
              <li
                key={event.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4",
                  (past || event.isCancelled) && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{event.title}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {EVENT_KIND_LABELS[event.kind] ?? event.kind}
                    </span>
                    {!event.isPublished && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Draft
                      </span>
                    )}
                    {event.isCancelled && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        Cancelled
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {friendlyDay(event.startsAt)} · {timeOfDay(event.startsAt)}
                    {event.endsAt ? ` – ${timeOfDay(event.endsAt)}` : ""}
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {event.courseId ? (
                      event.courseTitle
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" />
                        Everyone on the platform
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => {
                      setComposing(false);
                      setEditing(event);
                    }}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${event.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void remove(event)}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
