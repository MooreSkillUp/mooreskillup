"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import {
  EVENT_KINDS,
  type CourseChoice,
  type EventDraft,
  type EventKind,
  type ScheduleEvent,
} from "@/lib/schedule";

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Create or edit a scheduled event.
 *
 * Shared by the teacher and admin schedule pages — the only difference is that
 * admins may leave the course blank to reach every student. The server enforces
 * that regardless of what this form allows.
 */
export function EventEditor({
  courses,
  canScheduleForEveryone,
  editing,
  onSubmit,
  onCancel,
  busy,
}: {
  courses: CourseChoice[];
  canScheduleForEveryone: boolean;
  editing: ScheduleEvent | null;
  onSubmit: (draft: EventDraft) => Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<EventKind>("live_class");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [courseId, setCourseId] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setKind(editing?.kind ?? "live_class");
    setStartsAt(toLocalInput(editing?.startsAt));
    setEndsAt(toLocalInput(editing?.endsAt));
    setCourseId(editing?.courseId ?? "");
    setJoinUrl(editing?.joinUrl ?? "");
    setLocation(editing?.location ?? "");
    setIsPublished(editing?.isPublished ?? true);
    setError("");
  }, [editing]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!courseId && !canScheduleForEveryone) {
      setError("Choose which course this is for.");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        kind,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        course: courseId || null,
        joinUrl: joinUrl.trim(),
        location: location.trim(),
        isPublished,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save this event.",
      );
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">
        {editing ? "Edit event" : "Schedule an event"}
      </h2>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Input
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Week 3 live class"
        required
      />

      <div>
        <label htmlFor="event-kind" className="mb-1.5 block text-sm font-medium">
          Type
        </label>
        <select
          id="event-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as EventKind)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {EVENT_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="event-course" className="mb-1.5 block text-sm font-medium">
          Course
        </label>
        <select
          id="event-course"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">
            {canScheduleForEveryone ? "Everyone on the platform" : "Select a course"}
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          {canScheduleForEveryone
            ? "Leave blank to reach every student. Pick a course to reach only its students."
            : "Only students enrolled in this course will see it."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Starts"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          required
        />
        <Input
          label="Ends (optional)"
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
        />
      </div>

      <Input
        label="Join link (optional)"
        type="url"
        value={joinUrl}
        onChange={(event) => setJoinUrl(event.target.value)}
        placeholder="https://meet.google.com/..."
      />

      <Input
        label="Location (optional)"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder="Zoom, WhatsApp group, Lagos campus..."
      />

      <div>
        <label htmlFor="event-description" className="mb-1.5 block text-sm font-medium">
          Details (optional)
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="What will you cover? Anything students should prepare?"
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          className="h-4 w-4 rounded border-border accent-[var(--color-accent)]"
        />
        <span>
          Visible to students
          <span className="block text-xs text-muted-foreground">
            Uncheck to save as a draft nobody sees yet.
          </span>
        </span>
      </label>

      <div className="flex gap-2.5 pt-1">
        <Button type="submit" variant="accent" loading={busy} loadingText="Saving...">
          {editing ? "Save changes" : "Schedule event"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
