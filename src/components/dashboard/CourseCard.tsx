"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Heart, Lock, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getCoursePrice, getCourseSections, isCoursePurchased, type Course } from "@/lib/mock-data";
import { ProgressBar } from "../ui-kit/ProgressBar";
import { Button } from "../ui-kit/Button";

export function CourseCard({
  course,
  showProgress = true,
}: {
  course: Course;
  showProgress?: boolean;
}) {
  const { user, toggleWishlist } = useAuth();
  const pct = Math.round((course.completedLessons / course.totalLessons) * 100);
  const sections = getCourseSections(course, user);
  const freeSections = sections.filter((section) => section.isFree).length;
  const lockedSections = sections.filter((section) => section.isLocked).length;
  const wished = user?.wishlist?.includes(course.id) ?? false;
  const purchased = isCoursePurchased(course, user);
  const price = getCoursePrice(course);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm"
    >
      <div className={`relative h-36 bg-gradient-to-br ${course.cover} p-5`}>
        <BookOpen className="absolute right-4 top-4 h-12 w-12 text-white/20" />
        <button
          onClick={() => user && toggleWishlist(course.id)}
          className="absolute right-4 top-4 rounded-full bg-black/15 p-2 text-white backdrop-blur hover:bg-black/25"
          aria-label="Toggle wishlist"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
        </button>
        <div className="text-xs font-medium uppercase tracking-wider text-white/80">
          {course.interest} | {course.track}
        </div>
        <h3 className="mt-7 font-display text-xl font-bold text-white">{course.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
          <span>{course.modules.length} modules</span>
          <span>{course.totalLessons} lessons</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current" />
            {course.rating}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        {showProgress ? (
          <ProgressBar value={pct} label="Your progress" />
        ) : (
          <div className="rounded-2xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            Structured into modules with lessons, checkpoints, and project delivery moments.
          </div>
        )}
        <div className="rounded-2xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          {lockedSections > 0
            ? `${freeSections} free section${freeSections > 1 ? "s" : ""} available now. Unlock the rest after payment.`
            : "All sections are open in your current access level."}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            by {course.teacherName ?? course.instructor} • ${price}
          </span>
          <Link
            href={`/course/${course.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-accent"
          >
            Open <ArrowRight className="h-4 w-4" />
          </Link>
          {lockedSections > 0 && (
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4" /> {purchased ? "Unlocked" : "Preview"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
