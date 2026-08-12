"use client";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { BrandSpinner } from "@/components/shared/BrandSpinner";
import { cn } from "@/lib/utils";

/**
 * The full-screen wait, shown while a session resolves or a route decides where
 * to send someone.
 *
 * Deliberately quiet. This used to layer four simultaneous animations — two
 * pulsing background glows, a 128px rotating ring, and three bouncing dots —
 * around the wordmark, the brand name and the tagline. All of it competing, on
 * a screen whose only job is to say "one moment". It also looked nothing like
 * the loader on the front door, so the app changed character between one screen
 * and the next.
 *
 * Now: the mark, one spinner, nothing else.
 */
export function AppLoader({
  fullScreen = false,
  label = "Loading MooreSkillUp",
  className,
}: {
  fullScreen?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-7",
        fullScreen ? "fixed inset-0 z-[100] bg-background" : "min-h-56 w-full",
        className,
      )}
    >
      {fullScreen && <BrandLogo href={null} size="md" align="center" />}
      <BrandSpinner size={fullScreen ? "lg" : "md"} label={label} />
    </div>
  );
}
