"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest } from "./authenticated-api";

export type EventKind = "live_class" | "q_and_a" | "workshop" | "launch" | "deadline" | "other";

export const EVENT_KINDS: { value: EventKind; label: string }[] = [
  { value: "live_class", label: "Live class" },
  { value: "q_and_a", label: "Q&A session" },
  { value: "workshop", label: "Workshop" },
  { value: "launch", label: "Cohort launch" },
  { value: "deadline", label: "Deadline" },
  { value: "other", label: "Other" },
];

export const EVENT_KIND_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_KINDS.map((kind) => [kind.value, kind.label]),
);

/** A dashboard "coming up" row — an event or an assignment deadline. */
export interface UpcomingItem {
  id: string;
  type: "event" | "assignment";
  kind: string;
  title: string;
  courseId: string | null;
  courseTitle: string;
  at: string;
  /** Assignments are due on a day, events happen at a time. */
  allDay: boolean;
  joinUrl: string;
  location: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string | null;
  courseId: string | null;
  courseTitle: string;
  joinUrl: string;
  location: string;
  isCancelled: boolean;
  isPublished?: boolean;
  isPlatformWide?: boolean;
  createdByName?: string;
}

export interface CourseChoice {
  id: string;
  title: string;
}

function rowsOf(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const results = (payload as { results?: unknown[] })?.results;
  return Array.isArray(results) ? (results as Record<string, unknown>[]) : [];
}

function toEvent(raw: Record<string, unknown>): ScheduleEvent {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    kind: (raw.kind as EventKind) ?? "other",
    startsAt: String(raw.startsAt ?? ""),
    endsAt: raw.endsAt ? String(raw.endsAt) : null,
    courseId: raw.courseId ? String(raw.courseId) : null,
    courseTitle: String(raw.courseTitle ?? ""),
    joinUrl: String(raw.joinUrl ?? ""),
    location: String(raw.location ?? ""),
    isCancelled: Boolean(raw.isCancelled),
    isPublished: raw.isPublished === undefined ? true : Boolean(raw.isPublished),
    isPlatformWide: Boolean(raw.isPlatformWide),
    createdByName: raw.createdByName ? String(raw.createdByName) : "",
  };
}

/** The dashboard widget: events and deadlines merged, soonest first. */
export function useUpcoming(enabled = true, limit = 5) {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    authenticatedRequest<unknown>(`/api/student/upcoming/?limit=${limit}`)
      .then((payload) => {
        if (!active) return;
        setItems(
          rowsOf(payload).map((raw) => ({
            id: String(raw.id ?? ""),
            type: (raw.type as UpcomingItem["type"]) ?? "event",
            kind: String(raw.kind ?? "other"),
            title: String(raw.title ?? ""),
            courseId: raw.courseId ? String(raw.courseId) : null,
            courseTitle: String(raw.courseTitle ?? ""),
            at: String(raw.at ?? ""),
            allDay: Boolean(raw.allDay),
            joinUrl: String(raw.joinUrl ?? ""),
            location: String(raw.location ?? ""),
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, limit]);

  return { items, isLoading };
}

/** The student Schedule page — a longer horizon than the dashboard widget. */
export function useStudentSchedule(enabled = true) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    authenticatedRequest<unknown>("/api/student/schedule/")
      .then((payload) => {
        if (active) setEvents(rowsOf(payload).map(toEvent));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { events, isLoading };
}

export interface EventDraft {
  title: string;
  description?: string;
  kind: EventKind;
  startsAt: string;
  endsAt?: string | null;
  course?: string | null;
  joinUrl?: string;
  location?: string;
  isPublished?: boolean;
  isCancelled?: boolean;
}

/**
 * Manage events for whichever role is asking.
 *
 * Teacher and admin use the same screens; only the base path differs, and the
 * server decides what each may actually do. Keeping one hook means a fix to
 * scheduling lands for both roles at once.
 */
export function useManagedEvents(scope: "teacher" | "admin", enabled = true) {
  const base = scope === "admin" ? "/api/admin" : "/api/teacher";
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [courses, setCourses] = useState<CourseChoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [eventPayload, coursePayload] = await Promise.all([
        authenticatedRequest<unknown>(`${base}/events/`),
        authenticatedRequest<unknown>(`${base}/event-courses/`),
      ]);
      setEvents(rowsOf(eventPayload).map(toEvent));
      setCourses(
        rowsOf(coursePayload).map((raw) => ({
          id: String(raw.id ?? ""),
          title: String(raw.title ?? ""),
        })),
      );
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the schedule.");
    } finally {
      setIsLoading(false);
    }
  }, [base, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEvent = useCallback(
    async (draft: EventDraft) => {
      await authenticatedRequest(`${base}/events/`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      await load();
    },
    [base, load],
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<EventDraft>) => {
      await authenticatedRequest(`${base}/events/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    },
    [base, load],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      await authenticatedRequest(`${base}/events/${id}/`, { method: "DELETE" });
      await load();
    },
    [base, load],
  );

  return { events, courses, isLoading, error, createEvent, updateEvent, deleteEvent, reload: load };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** "Today", "Tomorrow", or a short date — how a person says it. */
export function friendlyDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function timeOfDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** How a "coming up" row reads: "Today · 14:00" or "Tomorrow" for all-day. */
export function whenLabel(iso: string, allDay: boolean): string {
  const day = friendlyDay(iso);
  return allDay ? day : `${day} · ${timeOfDay(iso)}`;
}

/** True when something starts within the hour — worth highlighting. */
export function isImminent(iso: string): boolean {
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms < 60 * 60 * 1000;
}
