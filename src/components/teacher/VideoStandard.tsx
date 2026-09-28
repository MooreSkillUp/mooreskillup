"use client";

import { Check, Mic } from "lucide-react";

/**
 * The recording standard, where the recording is being planned.
 *
 * It is already written down in the Recording Guide, which teachers read once
 * in their first week and have forgotten by the time they record section four.
 * This is the same eight lines, sitting next to the field, on the day it
 * matters.
 *
 * Ordered by what actually goes wrong. Audio is first because it is the only
 * fault that cannot be fixed afterwards and the one that makes a lesson
 * unwatchable; nobody abandons a course over a soft-focus camera.
 */
export function VideoStandard() {
  return (
    <details className="group rounded-2xl border border-border bg-muted/30 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        <span className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5" />
          What a good lesson video looks like
        </span>
        <span className="text-[10px] font-normal normal-case text-muted-foreground">
          <span className="group-open:hidden">Show ▸</span>
          <span className="hidden group-open:inline">Hide ▾</span>
        </span>
      </summary>

      <ul className="mt-3 space-y-2 text-sm">
        <Point strong>
          Sound matters more than picture. A quiet room and a cheap lapel
          microphone beat an expensive camera. Bad audio is the one thing nobody
          can fix afterwards.
        </Point>
        <Point>
          Five to fifteen minutes. One idea per lesson. If it runs past twenty,
          it is two lessons.
        </Point>
        <Point>
          Open by saying what they will be able to do by the end. Not who you
          are — they already chose you.
        </Point>
        <Point>
          1080p where you can, never below 720p. Text on screen has to be
          readable on a phone, so make your editor font bigger than feels right.
        </Point>
        <Point>
          Show the thing working. A student who watches you type and run it
          learns more than one who watches you explain it.
        </Point>
        <Point>
          Leave the mistakes in if you fix them out loud. Watching you find a
          typo and recover teaches more than a clean take.
        </Point>
        <Point>
          Record in one go and send it raw. Do not edit — we do that, and
          re-cutting an edited file is harder than cutting the original.
        </Point>
        <Point>
          Name the file for its lesson: <code className="rounded bg-muted px-1">01-what-is-python.mp4</code>.
          It is how we know which lesson it belongs to without asking you.
        </Point>
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Send raw files to your shared Drive folder. We upload them, check the
        quality, and put the video into this lesson for you — so leave this
        field empty unless you were given a link.
      </p>
    </details>
  );
}

function Point({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex gap-2">
      <Check
        className={`mt-0.5 h-4 w-4 shrink-0 ${strong ? "text-primary" : "text-muted-foreground"}`}
      />
      <span className={strong ? "font-medium" : ""}>{children}</span>
    </li>
  );
}
