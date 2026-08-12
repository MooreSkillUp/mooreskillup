"use client";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: 40, stroke: 3, mark: "text-[11px]" },
  md: { box: 64, stroke: 4, mark: "text-base" },
  lg: { box: 88, stroke: 5, mark: "text-xl" },
} as const;

/**
 * A circular MSU loading mark.
 *
 * Used wherever the app is waiting on something slow enough that a blank screen
 * would read as broken — the PWA launch screen most of all, where a cold start
 * on a scaled-to-zero API can take tens of seconds.
 *
 * The ring is a dashed SVG circle rather than a spinning border so it stays
 * perfectly round at any size and inherits the brand accent, and the initials
 * sit still in the middle so the mark stays legible while it turns.
 */
export function BrandSpinner({
  size = "md",
  label = "Loading",
  className,
}: {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const { box, stroke, mark } = SIZES[size];
  const radius = 50 - stroke * 1.5;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: box, height: box }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full animate-spin" style={{ animationDuration: "1.15s" }}>
        {/* The full ring, faint — gives the arc something to travel along. */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {/* A quarter-turn arc. strokeLinecap keeps the ends soft. */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.25} ${circumference}`}
          className="stroke-accent"
        />
      </svg>

      <span
        aria-hidden
        className={cn(
          "absolute font-display font-bold tracking-tight text-foreground",
          mark,
        )}
      >
        MSU
      </span>
    </div>
  );
}
