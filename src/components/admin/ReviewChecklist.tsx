"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";

/**
 * The things a reviewer has to check by watching, not by reading a field.
 *
 * The facts panel above it already covers what the platform can see for
 * itself — missing banners, empty sections, lessons with no video. None of
 * that tells you whether the audio is audible or the commands still work.
 *
 * Deliberately not enforced. A reviewer may have a good reason to approve
 * something with a box unticked, and a checklist that blocks approval gets
 * clicked through without being read. What it is for is the fifth course on a
 * tired evening, when the first four were fine and the temptation is to assume
 * the fifth is too.
 *
 * Ticks are per course and per browser, and they clear once the course leaves
 * review. They are a reviewer's own notes, not a record of what was approved.
 */

const CHECKS: ReadonlyArray<{ id: string; label: string; why?: string }> = [
  {
    id: "audio",
    label: "Every video is audible on a phone, without headphones",
    why: "The one fault that cannot be fixed later, and the one that loses students",
  },
  {
    id: "plays",
    label: "Each lesson actually plays, start to finish",
  },
  {
    id: "readable",
    label: "Text on screen is readable on a phone",
  },
  {
    id: "accurate",
    label: "Commands and code work as shown, on the versions named",
  },
  {
    id: "practice",
    label: "Every section ends in something the student does",
  },
  {
    id: "project",
    label: "There is at least one finished project",
  },
  {
    id: "assessment",
    label: "A final assessment exists, and passing it issues the certificate",
  },
  {
    id: "rights",
    label: "Nothing in it belongs to somebody else — music, slides, stock images",
    why: "We indemnify against this in the Teacher Agreement, so it is ours to check",
  },
];

export function ReviewChecklist({ courseId }: { courseId: string }) {
  const storageKey = `msu.review.${courseId}`;
  const [ticked, setTicked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      setTicked(saved ? (JSON.parse(saved) as string[]) : []);
    } catch {
      // Private window, blocked storage, corrupt value. The checklist still
      // works, it just will not be remembered.
      setTicked([]);
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setTicked((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Nothing to do; the tick still shows for this session.
      }
      return next;
    });
  };

  const done = ticked.length;

  return (
    <details className="group mt-4 rounded-2xl border border-border bg-muted/30 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        <span className="flex items-center gap-2">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Watched it through
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] normal-case tracking-normal ${
              done === CHECKS.length
                ? "bg-success/15 text-success"
                : "bg-background text-muted-foreground"
            }`}
          >
            {done} of {CHECKS.length}
          </span>
        </span>
        <span className="text-[10px] font-normal normal-case text-muted-foreground">
          <span className="group-open:hidden">Show ▸</span>
          <span className="hidden group-open:inline">Hide ▾</span>
        </span>
      </summary>

      <ul className="mt-3 space-y-2">
        {CHECKS.map((check) => (
          <li key={check.id}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={ticked.includes(check.id)}
                onChange={() => toggle(check.id)}
              />
              <span>
                {check.label}
                {check.why && (
                  <span className="block text-xs text-muted-foreground">{check.why}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Your own notes, kept in this browser. Nothing here blocks approval — it
        is here so the fifth course of the evening gets the same look as the
        first.
      </p>
    </details>
  );
}
