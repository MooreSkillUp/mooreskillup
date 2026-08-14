"use client";

import Link from "next/link";
import { ArrowRight, Compass, Play } from "lucide-react";

import { CourseBanner } from "@/components/course/CourseBanner";
import { Button } from "@/components/ui-kit/Button";
import type { DashboardCourse, StudentDashboard } from "@/lib/student";

/**
 * The dashboard's headline: the single next thing to do.
 *
 * The whole page exists to answer "what now?", and for anyone mid-course this is
 * the answer — so it is built as a hero rather than another bordered card in a
 * column of bordered cards.
 *
 * The artwork runs full-bleed to the card's edge instead of sitting inset with
 * padding around it, which is most of the difference between this reading as a
 * feature and reading as a list item. Progress is a ring rather than a bar: at
 * this size a bar is a thin grey line lost against the text, while a ring holds
 * its own beside the title and gives the percentage somewhere to live.
 */
export function ContinueLearningCard({
  continueLearning,
  course,
  loading,
}: {
  continueLearning: StudentDashboard["continueLearning"];
  course?: DashboardCourse;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="h-60 animate-pulse rounded-2xl bg-muted" />;
  }

  // Enrolled in nothing: point at the one action that helps. (A brand-new
  // student sees the fuller first-run screen instead of this.)
  if (!continueLearning) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Compass className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold">Nothing in progress</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Enrol in a course and it will appear here, ready to pick up whenever you are.
        </p>
        <Link href="/dashboard/courses?tab=browse" className="mt-5 inline-flex">
          <Button variant="accent">Browse courses</Button>
        </Link>
      </div>
    );
  }

  const progress = Math.round(continueLearning.progressPercent);
  const started = progress > 0;
  const href = continueLearning.lessonId
    ? `/lesson/${continueLearning.lessonId}`
    : `/course/${continueLearning.courseId}`;

  return (
    <section className="group overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row">
        {/* Full-bleed artwork. Fixed width on desktop so the text column keeps a
            comfortable measure however long the course title is. */}
        {course && (
          <div className="relative w-full shrink-0 overflow-hidden sm:w-64 lg:w-72">
            <div className="h-40 sm:h-full sm:min-h-[15rem]">
              <CourseBanner
                title={course.title}
                category={course.program}
                certificateEnabled={course.certificateEnabled}
                dense
                bannerImage={course.bannerImage ?? undefined}
                bannerTheme={course.bannerTheme ?? "default"}
                categoryAccentColor={course.categoryAccentColor}
                className="h-full rounded-none"
              />
            </div>

            {/* A play affordance over the artwork, so the whole panel reads as
                something you press rather than a picture beside a button. */}
            <Link
              href={href}
              aria-label={started ? "Continue this course" : "Start this course"}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#0f203c] shadow-lg transition-transform duration-200 group-hover:scale-105">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </Link>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {started ? "Continue learning" : "Ready when you are"}
              </p>
              <h2 className="mt-1.5 line-clamp-2 font-display text-xl font-bold leading-tight sm:text-2xl">
                {continueLearning.courseTitle}
              </h2>
            </div>

            <ProgressRing value={progress} />
          </div>

          {continueLearning.lessonTitle && (
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">
                  {started ? "Next lesson" : "Starts with"}
                </span>
                <span className="block truncate text-sm font-medium">
                  {continueLearning.lessonTitle}
                </span>
              </span>
            </div>
          )}

          <div>
            <Link href={href}>
              <Button variant="accent" size="lg" className="w-full sm:w-auto">
                {started ? "Continue" : "Start learning"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact progress ring — holds its own beside a heading, unlike a thin bar. */
function ProgressRing({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative hidden h-16 w-16 shrink-0 sm:block" title={`${value}% complete`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold tabular-nums">
        {value}%
      </span>
    </div>
  );
}
