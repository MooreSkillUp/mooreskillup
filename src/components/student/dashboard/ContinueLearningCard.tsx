"use client";

import Link from "next/link";
import { Compass, Play } from "lucide-react";

import { CourseBanner } from "@/components/course/CourseBanner";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import type { DashboardCourse, StudentDashboard } from "@/lib/student";

/**
 * The dashboard's headline: the single next thing to do.
 *
 * The whole page exists to answer "what now?", and for anyone mid-course this
 * is the answer, so it leads. `course` carries the full catalog record for the
 * same course, which lets the banner match the course cards exactly instead of
 * being a second, slightly different treatment.
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
    return <div className="h-56 animate-pulse rounded-[2rem] border border-border bg-muted/40" />;
  }

  // Nobody enrolled yet — point at the one action that helps.
  if (!continueLearning) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-card p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-foreground">
          Let&apos;s find your first course
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Browse the catalogue and enrol — free courses unlock straight away, and your progress
          starts tracking from your first lesson.
        </p>
        <Link href="/dashboard/courses?tab=browse" className="mt-6 inline-flex">
          <Button variant="accent" size="lg" className="rounded-full px-8">
            Browse courses
          </Button>
        </Link>
      </div>
    );
  }

  const progress = Math.round(continueLearning.progressPercent);
  const href = continueLearning.lessonId
    ? `/lesson/${continueLearning.lessonId}`
    : `/course/${continueLearning.courseId}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        {course && (
          <div className="w-full shrink-0 sm:w-56 lg:w-60">
            {/* Artwork, not a second summary: the title, level and lesson count
                all appear beside it, so the banner runs in dense mode. */}
            <CourseBanner
              title={course.title}
              category={course.program}
              certificateEnabled={course.certificateEnabled}
              dense
              bannerImage={course.bannerImage ?? undefined}
              bannerTheme={course.bannerTheme ?? "default"}
              categoryAccentColor={course.categoryAccentColor}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {progress > 0 ? "Pick up where you left off" : "Ready when you are"}
          </div>

          <h2 className="mt-1.5 line-clamp-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            {continueLearning.courseTitle}
          </h2>

          {continueLearning.lessonTitle && (
            <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
              Next up: <span className="font-medium text-foreground">{continueLearning.lessonTitle}</span>
            </p>
          )}

          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Course progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <ProgressBar value={continueLearning.progressPercent} />
          </div>

          <Link href={href} className="mt-6 inline-flex">
            <Button variant="accent" size="lg" className="rounded-full px-8 shadow-sm">
              <Play className="h-4 w-4 fill-current" />
              {progress > 0 ? "Continue" : "Start learning"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
