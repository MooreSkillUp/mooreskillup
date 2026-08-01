"use client";

import Link from "next/link";
import { Clock3, Heart, PlayCircle, Star, Users } from "lucide-react";
import { formatNaira } from "@/lib/commerce";
import type { EnrolledCourse, StudentCourse } from "@/lib/student";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { CourseBanner } from "@/components/course/CourseBanner";
import { cn } from "@/lib/utils";

/**
 * One course, in the two states a student meets it in.
 *
 * **Browsing** answers "should I take this?" — rating, length, level, price.
 * **Enrolled** answers "where was I?" — progress and a way back in. Price and
 * rating are noise once you already own the course, so they go.
 *
 * The banner is artwork here, not a second summary: it used to repeat the
 * subtitle, level, lesson count and price that the card body prints directly
 * underneath it.
 */
export function StudentCourseCard({
  course,
  enrollment,
  onToggleWishlist,
}: {
  course: StudentCourse;
  enrollment?: EnrolledCourse;
  onToggleWishlist?: (course: StudentCourse) => void;
}) {
  const isFree = course.price === 0;
  const showDiscount = course.discountPrice !== null && course.discountPrice < course.price;
  const courseHref = course.id ? `/course/${course.id}` : "#";
  const resumeHref = enrollment?.lastLessonId
    ? `/lesson/${enrollment.lastLessonId}`
    : courseHref;
  const progress = Math.round(enrollment?.progressPercent ?? 0);
  const isComplete = enrollment?.status === "completed";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link href={courseHref} className="block">
        <CourseBanner
          title={course.title || "Untitled course"}
          category={course.program}
          certificateEnabled={course.certificateEnabled}
          dense
          bannerImage={course.bannerImage ?? undefined}
          bannerTheme={course.bannerTheme ?? "default"}
          categoryAccentColor={course.categoryAccentColor}
          className="rounded-none border-0"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={courseHref} className="min-w-0">
            <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug transition-colors group-hover:text-primary">
              {course.title}
            </h3>
            {course.subtitle && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
            )}
          </Link>

          {onToggleWishlist && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onToggleWishlist(course);
              }}
              className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              aria-label={course.isInWatchlist ? "Remove from saved" : "Save course"}
            >
              <Heart
                className={cn("h-4 w-4", course.isInWatchlist && "fill-primary text-primary")}
              />
            </button>
          )}
        </div>

        {/* Enrolled students already chose this course; the sales details are
            replaced by where they got to. */}
        {enrollment ? (
          <div className="mt-auto pt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                {isComplete ? "Completed" : `${progress}% complete`}
              </span>
              <span className="text-muted-foreground">
                {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            <ProgressBar value={enrollment.progressPercent} />

            <Link
              href={resumeHref}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              <PlayCircle className="h-4 w-4" />
              {isComplete ? "Review course" : progress > 0 ? "Continue" : "Start learning"}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {course.reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{course.averageRating}</span>(
                  {course.reviewCount})
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {course.totalLessons} lessons
              </span>
              {course.enrollments > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {course.enrollments}
                </span>
              )}
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 pt-4">
              <div className="font-display text-lg font-bold">
                {isFree ? (
                  <span className="text-success">Free</span>
                ) : showDiscount ? (
                  <span className="flex flex-wrap items-baseline gap-1.5">
                    {formatNaira(course.discountPrice as number)}
                    <span className="text-sm font-normal text-muted-foreground line-through">
                      {formatNaira(course.price)}
                    </span>
                  </span>
                ) : (
                  formatNaira(course.price)
                )}
              </div>

              <Link
                href={courseHref}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                View course
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
