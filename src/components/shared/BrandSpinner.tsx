"use client";

import { cn } from "@/lib/utils";

const SIZES = {
  xs: { box: 16, stroke: 10 },
  sm: { box: 24, stroke: 9 },
  md: { box: 36, stroke: 8 },
  lg: { box: 56, stroke: 7 },
} as const;

/**
 * The app's loading mark.
 *
 * One shape everywhere: a faint track with a single accent arc turning over it.
 * No wordmark, no bouncing — a loader is furniture, and the quickest way to make
 * an interface feel cheap is to make its furniture perform.
 *
 * Stroke width is expressed against a fixed 100-unit viewBox and gets *thinner*
 * as the mark grows, so a 16px inline spinner stays visible while a 56px one
 * stays delicate. A single fixed width would look heavy at large sizes and
 * disappear at small ones.
 *
 * Prefer a skeleton when you know the shape of what is coming — it tells the
 * reader more. Use this for waits whose length you cannot predict: a cold start,
 * a sign-in, a payment redirect.
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
  const { box, stroke } = SIZES[size];
  const radius = 50 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex shrink-0", className)}
      style={{ width: box, height: box }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "0.85s", animationTimingFunction: "linear" }}
      >
        {/* Track. Low opacity rather than a muted colour so the mark sits
            correctly on cards, on the page, and on a coloured banner alike. */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-current opacity-15"
        />
        {/* A little over a quarter turn: enough to read as motion, short enough
            to stay calm. Round caps keep the ends soft. */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
          className="stroke-accent"
        />
      </svg>
    </span>
  );
}
