"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderGit2,
  Lock,
  PlayCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface AccordionLesson {
  id: string;
  title: string;
  type: string;
  durationMinutes?: number | null;
  isPreviewable: boolean;
  completed?: boolean;
}

export interface AccordionSection {
  id: string;
  title: string;
  description?: string;
  isFree: boolean;
  isLocked: boolean;
  lessonCount: number;
  durationMinutes: number;
  completedCount: number;
  lessons: AccordionLesson[];
  taskCount?: number;
  projectCount?: number;
}

/** 63 -> "1h 3m", 48 -> "48m", 0 -> "" */
export function formatMinutes(total?: number | null): string {
  if (!total) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * The course curriculum on the course page.
 *
 * Two audiences, one component. Someone deciding whether to enrol is reading it
 * as a table of contents — how much is there, how is it organised, can I sample
 * any of it. Someone already enrolled is reading it as a map — where am I, what
 * is left. So sections carry both a duration (for the first) and a completion
 * count (for the second), and only show the count once there is progress to
 * report.
 *
 * Locked lessons stay visible rather than hidden. Seeing what you would get is
 * the argument for buying; hiding it just makes the page look short.
 */
export function CurriculumAccordion({
  sections,
  courseOwned,
  lessonHref,
}: {
  sections: AccordionSection[];
  courseOwned: boolean;
  lessonHref: (lessonId: string) => string;
}) {
  // The first section opens by default: an accordion where everything is shut
  // makes a reader work before it tells them anything.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(sections[0] ? [sections[0].id] : []),
  );

  const allOpen = openIds.size === sections.length && sections.length > 0;

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setOpenIds(allOpen ? new Set() : new Set(sections.map((section) => section.id)));

  const totalLessons = sections.reduce((sum, s) => sum + s.lessonCount, 0);
  const totalMinutes = sections.reduce((sum, s) => sum + s.durationMinutes, 0);

  if (!sections.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <ClipboardList className="mx-auto h-9 w-9 text-muted-foreground/30" />
        <p className="mt-3 font-medium">No lessons yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This course is still being built. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Course content</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {sections.length} {sections.length === 1 ? "section" : "sections"} · {totalLessons}{" "}
            {totalLessons === 1 ? "lesson" : "lessons"}
            {totalMinutes ? ` · ${formatMinutes(totalMinutes)} total` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm font-semibold text-primary transition-colors hover:text-accent"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="divide-y divide-border">
        {sections.map((section, index) => {
          const isOpen = openIds.has(section.id);
          const hasProgress = section.completedCount > 0;
          const isDone = section.lessonCount > 0 && section.completedCount >= section.lessonCount;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums",
                    isDone
                      ? "bg-success/15 text-success"
                      : hasProgress
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4.5 w-4.5" /> : index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{section.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {section.lessonCount} {section.lessonCount === 1 ? "lesson" : "lessons"}
                    {section.durationMinutes ? ` · ${formatMinutes(section.durationMinutes)}` : ""}
                    {/* Only mention progress once there is some — "0 of 4 done"
                        on every section reads as a scolding. */}
                    {hasProgress ? ` · ${section.completedCount} done` : ""}
                    {section.isFree && !courseOwned ? " · Free preview" : ""}
                  </span>
                </span>

                {section.isLocked && !courseOwned && (
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  {section.description && (
                    <p className="mb-3 pl-13 text-sm text-muted-foreground">{section.description}</p>
                  )}

                  <ul className="space-y-0.5">
                    {section.lessons.map((lesson) => {
                      const openable =
                        courseOwned || !section.isLocked || lesson.isPreviewable || section.isFree;
                      const Icon =
                        lesson.type === "video"
                          ? PlayCircle
                          : lesson.type === "resource"
                            ? FileText
                            : ClipboardList;

                      const body = (
                        <>
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                              lesson.completed
                                ? "bg-success/15 text-success"
                                : openable
                                  ? "bg-muted text-muted-foreground"
                                  : "text-muted-foreground/60",
                            )}
                          >
                            {lesson.completed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : openable ? (
                              <Icon className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm">
                            {lesson.title || "Untitled lesson"}
                          </span>

                          {lesson.isPreviewable && !courseOwned && (
                            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                              Preview
                            </span>
                          )}

                          {lesson.durationMinutes ? (
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {formatMinutes(lesson.durationMinutes)}
                            </span>
                          ) : null}
                        </>
                      );

                      return (
                        <li key={lesson.id}>
                          {openable ? (
                            <Link
                              href={lessonHref(lesson.id)}
                              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                              {body}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Assignments and projects are listed but never gate anything —
                      they're submitted off-platform, so we can say what exists,
                      never whether it was done. */}
                  {(section.taskCount || section.projectCount) && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {section.taskCount ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {section.taskCount} {section.taskCount === 1 ? "assignment" : "assignments"}
                        </span>
                      ) : null}
                      {section.projectCount ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          <FolderGit2 className="h-3.5 w-3.5" />
                          {section.projectCount}{" "}
                          {section.projectCount === 1 ? "project" : "projects"}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
