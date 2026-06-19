"use client";

import { cn } from "@/lib/utils";

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
      className={cn(
        "flex items-center justify-center",
        fullScreen &&
          "fixed inset-0 z-[100] overflow-hidden bg-background/95 backdrop-blur-xl",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px] animate-pulse" />

        <div
          className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[90px]"
          style={{
            animation: "pulse 3s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Main Loader */}
        <div className="relative">
          {/* Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />

          <div
            className="h-32 w-32 rounded-full border-t-2 border-primary border-r-2 border-r-accent"
            style={{
              animation: "spin 2s linear infinite",
            }}
          />

          {/* Inner Circle */}
          <div className="absolute inset-4 flex items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur-xl shadow-2xl">
            <span className="font-display text-3xl font-bold tracking-widest">
              <span className="text-primary">M</span>
              <span className="text-foreground">S</span>
              <span className="text-accent">U</span>
            </span>
          </div>
        </div>

        {/* Brand Name */}
        <div className="mt-8 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            MooreSkillUp
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Learn • Build • Grow
          </p>
        </div>

        {/* Animated Dots */}
        <div className="mt-6 flex gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full bg-primary"
            style={{
              animation: "bounce 1.4s infinite",
            }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-primary"
            style={{
              animation: "bounce 1.4s infinite 0.2s",
            }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-accent"
            style={{
              animation: "bounce 1.4s infinite 0.4s",
            }}
          />
        </div>
      </div>
    </div>
  );
}