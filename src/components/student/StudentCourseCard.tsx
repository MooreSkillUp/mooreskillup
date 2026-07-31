"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Users, ArrowRight, Play } from "lucide-react";
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
  const isFree = course.price === 0;
  const showDiscount = course.discountPrice !== null && course.discountPrice < course.price;
  const courseHref = `/course/${course.id}`;
  const continueHref = enrollment?.lastLessonId
    ? `/lesson/${enrollment.lastLessonId}`
    : courseHref;

  const resolvedAccentColor = course.categoryAccentColor || "#F97316";

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-sm transition-all duration-300"
    >
      {/* ── Top Half: Course Banner ──────────────────────────────────── */}
      <div className="p-2 pb-0">
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
          isBookmarked={course.isInWatchlist}
          onBookmarkToggle={onToggleWishlist ? () => onToggleWishlist(course) : undefined}
        />
      </div>

      {/* ── Bottom Half: Card Body ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-5">
        {/* Enrolled stats / ratings row */}
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground/70" />
            <span>{course.enrollments || 0} Enrolled</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {course.reviewCount > 0 ? (
              <span>
                <strong className="text-foreground">{course.averageRating}</strong> ({course.reviewCount} reviews)
              </span>
            ) : (
              <span>New course</span>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-4" />

        {/* Bottom CTA & Price row */}
        <div className="mt-auto flex items-center justify-between gap-4">
          {/* Price / Progress */}
          <div className="min-w-0">
            {enrollment ? (
              <div className="w-28 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Progress</span>
                  <span>{Math.round(enrollment.progressPercent)}%</span>
                </div>
                <ProgressBar value={enrollment.progressPercent} />
              </div>
            ) : (
              <div className="font-display text-lg font-bold text-foreground">
                {isFree ? (
                  <span className="text-green-600 dark:text-green-400">Free</span>
                ) : showDiscount ? (
                  <div className="flex flex-col">
                    <span className="text-xs font-normal text-muted-foreground line-through">
                      {formatNaira(course.price)}
                    </span>
                    <span className="text-lg font-extrabold text-foreground">
                      {formatNaira(course.discountPrice as number)}
                    </span>
                  </div>
                ) : (
                  formatNaira(course.price)
                )}
              </div>
            )}
          </div>

          {/* Button */}
          {enrollment ? (
            <Link
              href={continueHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition duration-200"
              style={{
                borderColor: resolvedAccentColor,
                color: resolvedAccentColor,
              }}
            >
              <Play className="h-3 w-3 fill-current" />
              Continue
            </Link>
          ) : (
            <Link
              href={courseHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition duration-200 group-hover:bg-primary group-hover:text-white"
              style={{
                borderColor: resolvedAccentColor,
                color: resolvedAccentColor,
              }}
            >
              View course
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
