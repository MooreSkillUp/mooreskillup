"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface CurriculumLessonItem {
  id: string;
  title: string;
  type: string;
  locked: boolean;
  completed: boolean;
  durationMinutes?: number | null;
}

export interface CurriculumSectionItem {
  id: string;
  title: string;
  isLocked?: boolean;
  lessons: CurriculumLessonItem[];
  taskCount?: number;
}

/** "05:28" — matches how a player shows a duration. */
function formatDuration(minutes?: number | null): string {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}:00`.replace(/^(\d):/, "0$1:");
}

/**
 * The course contents, beside the lesson being watched.
 *
 * Sections collapse, and the one containing the current lesson opens on load —
 * a student arriving mid-course should see where they are without hunting for
 * it, and shouldn't have to scroll past five finished sections to find it.
 *
 * Each section carries its own "3/5", because a single course-wide percentage
 * tells you how far you have come but not how close the next milestone is.
 */
export function CurriculumSidebar({
  sections,
  currentLessonId,
  courseId,
  className,
}: {
  sections: CurriculumSectionItem[];
  currentLessonId: string;
  courseId?: string;
  className?: string;
}) {
  const currentSectionId = sections.find((section) =>
    section.lessons.some((lesson) => lesson.id === currentLessonId),
  )?.id;

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(currentSectionId ? [currentSectionId] : []),
  );

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const totalDone = sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.completed).length,
    0,
  );
  const percent = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

  return (
    <aside className={cn("rounded-2xl border border-border bg-card", className)}>
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Course content</h2>
          {courseId && (
            <Link
              href={`/course/${courseId}`}
              className="text-xs font-semibold text-primary transition-colors hover:text-accent"
            >
              Overview
            </Link>
          )}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {percent}% complete · {totalDone} of {totalLessons} lessons
        </p>
      </div>

      <div className="max-h-[32rem] overflow-y-auto p-2">
        {sections.map((section, index) => {
          const done = section.lessons.filter((lesson) => lesson.completed).length;
          const isOpen = openIds.has(section.id);
          const holdsCurrent = section.id === currentSectionId;

          return (
            <div key={section.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  holdsCurrent && "bg-muted/60",
                )}
              >
                {/* A left rule marks the section you are in — cheaper to scan
                    than colouring the whole row. */}
                <span
                  aria-hidden
                  className={cn(
                    "h-8 w-0.5 shrink-0 rounded-full",
                    holdsCurrent ? "bg-accent" : "bg-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {index + 1}. {section.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {done}/{section.lessons.length}
                    {section.taskCount ? ` · ${section.taskCount} task` : ""}
                  </span>
                </span>
                {section.isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <ul className="mt-0.5 space-y-0.5 pl-3">
                  {section.lessons.map((lesson, lessonIndex) => {
                    const active = lesson.id === currentLessonId;
                    const Icon =
                      lesson.type === "video"
                        ? PlayCircle
                        : lesson.type === "resource"
                          ? FileText
                          : ClipboardList;

                    return (
                      <li key={lesson.id}>
                        <Link
                          href={lesson.locked ? "#" : `/lesson/${lesson.id}`}
                          onClick={(event) => lesson.locked && event.preventDefault()}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                            active
                              ? "bg-accent/10"
                              : lesson.locked
                                ? "cursor-not-allowed opacity-55"
                                : "hover:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                              active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                            )}
                          >
                            {lesson.locked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Icon className="h-3.5 w-3.5" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-sm",
                                active ? "font-medium text-accent" : "text-foreground",
                              )}
                            >
                              {index + 1}.{lessonIndex + 1} {lesson.title || "Untitled"}
                            </span>
                            {lesson.durationMinutes ? (
                              <span className="block text-[11px] text-muted-foreground">
                                {formatDuration(lesson.durationMinutes)}
                              </span>
                            ) : null}
                          </span>

                          {/* An empty ring rather than nothing, so a finished
                              lesson reads as a filled version of the same mark. */}
                          {lesson.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
