"use client";

import Link from "next/link";
import { Award, Compass, PlayCircle, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";

const STEPS = [
  {
    icon: Compass,
    title: "Find a course",
    body: "Browse by track, or start from what you told us you're interested in.",
  },
  {
    icon: PlayCircle,
    title: "Learn at your pace",
    body: "Lessons unlock as you go. We remember exactly where you stopped.",
  },
  {
    icon: TrendingUp,
    title: "Watch it add up",
    body: "Your time, streak and progress start counting from your first lesson.",
  },
  {
    icon: Award,
    title: "Earn a certificate",
    body: "Finish a course and get a verifiable certificate with your name on it.",
  },
];

/**
 * The dashboard for a student with no courses yet.
 *
 * Replaces five separate empty states — no course to continue, no courses, no
 * minutes, no streak, nothing coming up — each apologising individually. All
 * honest, but stacked they read as "this app has nothing in it", which is the
 * first thing a new student would have seen.
 *
 * One invitation instead. Nothing here is invented: it describes what will
 * happen, rather than pretending it already has.
 */
export function FirstRun({ name }: { name?: string }) {
  const firstName = (name ?? "").trim().split(/\s+/)[0];

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-xl font-bold sm:text-2xl">
          {firstName ? `Let's get you started, ${firstName}` : "Let's get you started"}
        </h2>
        <p className="mt-2 text-balance text-sm leading-relaxed text-muted-foreground">
          You haven&apos;t enrolled in anything yet. Pick your first course and your dashboard
          fills in as you learn.
        </p>

        <Link href="/dashboard/courses?tab=recommended" className="mt-5 inline-block">
          <Button variant="accent" size="lg">
            <Compass className="h-4 w-4" />
            Find your first course
          </Button>
        </Link>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Step {index + 1}
              </span>
            </div>
            <p className="mt-2.5 text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
