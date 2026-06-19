"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Heart, PlayCircle, Star, Users } from "lucide-react";
import { formatNaira } from "@/lib/commerce";
import type { EnrolledCourse, StudentCourse } from "@/lib/student";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

// A deterministic gradient per course (no uploaded images, by design).
const GRADIENTS = [
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-sky-500 via-cyan-500 to-emerald-500",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-fuchsia-500 via-violet-500 to-indigo-500",
  "from-teal-500 via-emerald-500 to-lime-500",
  "from-rose-500 via-red-500 to-orange-500",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash];
}

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
      <Link href={course.id ? `/course/${course.id}` : "#"} className={`relative block bg-gradient-to-br ${gradientFor(course.id)} p-5 text-white`}>
        <BookOpen className="absolute right-4 top-4 h-12 w-12 text-white/15" />
        <div className="text-[11px] font-medium uppercase tracking-wider text-white/80">
          {course.program} · {LEVEL_LABEL[course.level]}
        </div>
        <div className="mt-2 line-clamp-2 font-display text-lg font-bold leading-tight">
          {course.title || "Untitled course"}
        </div>
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleWishlist(course);
            }}
            className="absolute bottom-4 right-4 rounded-full bg-white/15 p-2 backdrop-blur transition hover:bg-white/25"
            aria-label={course.isInWatchlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${course.isInWatchlist ? "fill-white" : ""}`} />
          </button>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>

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
            <Link href={`/course/${course.id}`} className="text-sm font-semibold text-primary">
              View course →
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
