"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, Heart, PlayCircle, Sparkles, Star, Users } from "lucide-react";
import { formatNaira } from "@/lib/commerce";
import type { EnrolledCourse, StudentCourse } from "@/lib/student";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { CourseBanner } from "@/components/course/CourseBanner";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function StudentCourseCard({
  course,
  enrollment,
  onToggleWishlist,
}: {
  course: StudentCourse;
  enrollment?: EnrolledCourse;
  onToggleWishlist?: (course: StudentCourse) => void;
}) {
  const href = enrollment ? `/lesson/${enrollment.lastLessonId ?? ""}` : `/course/${course.id}`;
  const isFree = course.price === 0;
  const showDiscount = course.discountPrice !== null && course.discountPrice < course.price;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm"
    >
      <Link href={course.id ? `/course/${course.id}` : "#"} className="block p-2">
        <CourseBanner
          title={course.title || "Untitled course"}
          subtitle={course.subtitle}
          category={course.program}
          track={course.track}
          level={LEVEL_LABEL[course.level]}
          durationLabel={`${course.totalLessons || 0} lessons`}
          priceLabel={isFree ? "Free" : showDiscount ? formatNaira(course.discountPrice as number) : formatNaira(course.price)}
          certificateEnabled={course.certificateEnabled}
          compact
          bannerImage={course.bannerImage ?? undefined}
          bannerTheme={course.bannerTheme ?? "default"}
          categoryAccentColor={course.categoryAccentColor}
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{course.program}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
          </div>
          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleWishlist(course);
              }}
              className="rounded-full border border-border bg-background p-2 text-muted-foreground transition hover:border-primary/35 hover:text-primary"
              aria-label={course.isInWatchlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-4 w-4 ${course.isInWatchlist ? "fill-primary text-primary" : ""}`} />
            </button>
          )}
        </div>

        {course.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.techStack.slice(0, 3).map((tech) => (
              <span key={tech} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {course.reviewCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {course.averageRating} ({course.reviewCount})
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.enrollments}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {course.totalLessons} lessons
          </span>
        </div>

        {enrollment ? (
          <div className="mt-4">
            <ProgressBar value={enrollment.progressPercent} />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Math.round(enrollment.progressPercent)}% complete
              </span>
              <Link
                href={enrollment.lastLessonId ? `/lesson/${enrollment.lastLessonId}` : `/course/${course.id}`}
                className="flex items-center gap-1 text-sm font-semibold text-primary"
              >
                <PlayCircle className="h-4 w-4" />
                {enrollment.progressPercent > 0 ? "Continue" : "Start"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <div className="font-display text-lg font-bold">
              {isFree ? (
                <span className="text-success">Free</span>
              ) : showDiscount ? (
                <span className="flex items-center gap-2">
                  {formatNaira(course.discountPrice as number)}
                  <span className="text-sm font-normal text-muted-foreground line-through">
                    {formatNaira(course.price)}
                  </span>
                </span>
              ) : (
                formatNaira(course.price)
              )}
            </div>
            <Link href={`/course/${course.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> View course
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
