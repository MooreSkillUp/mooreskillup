"use client";

import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type StudioStep = "basics" | "media" | "curriculum" | "pricing" | "certification" | "publish";

export interface StepDefinition {
  id: StudioStep;
  label: string;
  hint: string;
  /** How many of this step's requirements are met, out of how many. */
  done: number;
  total: number;
}

/**
 * The studio's spine: six steps, with how finished each one is.
 *
 * The editor used to be a single scroll of every field a course has — title
 * through to the last lesson of the last section. It worked, but it gave a
 * teacher no sense of where they were or how much was left, and finding one
 * field meant scrolling past forty others.
 *
 * Progress is counted per step rather than shown as one overall bar, because
 * "you are 60% done" tells a teacher nothing about *what to do next*, which is
 * the only question this rail exists to answer.
 */
export function StudioStepRail({
  steps,
  active,
  onSelect,
}: {
  steps: StepDefinition[];
  active: StudioStep;
  onSelect: (step: StudioStep) => void;
}) {
  return (
    <nav aria-label="Course setup steps" className="rounded-2xl border border-border bg-card p-2">
      <ol className="space-y-0.5">
        {steps.map((step, index) => {
          const isActive = step.id === active;
          const isComplete = step.total > 0 && step.done >= step.total;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-accent/10" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                    isComplete
                      ? "bg-success/15 text-success"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      isActive && "text-accent",
                    )}
                  >
                    {step.label}
                  </span>
                  {/* The count only appears once there is something to count —
                      "0/0" on a step with no requirements reads as broken. */}
                  {step.total > 0 && (
                    <span className="block text-[11px] text-muted-foreground">
                      {step.done}/{step.total} {step.hint}
                    </span>
                  )}
                </span>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
