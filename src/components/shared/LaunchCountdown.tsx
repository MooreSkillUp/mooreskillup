"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { BrandLogo, BRAND_TAGLINE } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui-kit/Button";
import type { LaunchState } from "@/lib/feature-flags";

/**
 * What a visitor sees before MooreSkillUp opens.
 *
 * This is deliberately not a waitlist: nothing is collected here. Someone who
 * arrives early from the website gets a date, a reason to come back, and a way
 * to put the app on their phone — not a form asking for an email address we
 * would then have to do something with.
 *
 * A Super Admin sets the date and the words in Settings, and flips the platform
 * to live on the day. Nobody deletes a page; the same app just opens.
 */
function remaining(targetMs: number | null) {
  if (targetMs === null) return null;
  const ms = targetMs - Date.now();
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function LaunchCountdown({ launch }: { launch: LaunchState }) {
  // A number, not a Date: a fresh Date each render would restart the interval
  // on every tick, which is the classic way a countdown quietly eats a phone.
  const targetMs = launch.launchAt ? new Date(launch.launchAt).getTime() : null;
  const valid = targetMs !== null && !Number.isNaN(targetMs);
  const [left, setLeft] = useState(() => remaining(valid ? targetMs : null));

  useEffect(() => {
    if (!valid || !launch.countdownEnabled) return;
    setLeft(remaining(targetMs));
    const id = setInterval(() => setLeft(remaining(targetMs)), 1000);
    return () => clearInterval(id);
  }, [launch.countdownEnabled, targetMs, valid]);

  const showCountdown = launch.countdownEnabled && left !== null;
  const units = left
    ? [
        { label: left.days === 1 ? "day" : "days", value: left.days },
        { label: "hrs", value: left.hours },
        { label: "min", value: left.minutes },
        { label: "sec", value: left.seconds },
      ]
    : [];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <BrandLogo tagline={false} />
      <p className="mt-3 text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
        {BRAND_TAGLINE}
      </p>

      <h1 className="mt-10 max-w-2xl text-balance font-display text-4xl font-bold sm:text-5xl">
        {launch.headline || "Something is coming"}
      </h1>

      {launch.message && (
        <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">{launch.message}</p>
      )}

      {showCountdown && (
        <div className="mt-10 flex flex-wrap items-end justify-center gap-3 sm:gap-5">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="min-w-[76px] rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:min-w-[92px]"
            >
              <div className="font-display text-3xl font-bold tabular-nums text-accent sm:text-4xl">
                {String(unit.value).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {valid && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Opens{" "}
          {new Date(targetMs).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      {launch.ctaLabel && launch.ctaUrl && (
        <a href={launch.ctaUrl} className="mt-9" target="_blank" rel="noreferrer">
          <Button variant="accent" size="lg">
            {launch.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      )}

      <p className="mt-12 max-w-md text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/auth/login" className="font-semibold text-accent hover:underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
