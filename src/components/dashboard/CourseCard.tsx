"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Heart, PlayCircle } from "lucide-react";
import type { TeacherCourse } from "@/lib/teacher-workspace";
import { formatNaira } from "@/lib/commerce";
import { ProgressBar } from "../ui-kit/ProgressBar";
import { Button } from "../ui-kit/Button";

export function CourseCard({
  course,
  label,
  progress,
  ctaLabel = "Open Course",
  ctaHref,
  continueHref,
  brandLabel,
  previewHref,
  secondaryAction,
}: {
  course: TeacherCourse;
  label: string;
  progress?: number;
  ctaLabel?: string;
  ctaHref?: string;
  continueHref?: string | null;
  brandLabel: string;
  previewHref?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    active?: boolean;
  };
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm"
    >
      <div className="relative bg-gradient-to-br from-primary via-primary-glow to-accent p-5 text-white">
        <BookOpen className="absolute right-4 top-4 h-12 w-12 text-white/15" />
        <div className="text-xs font-medium uppercase tracking-wider text-white/80">
          {course.program} | {course.track}
        </div>
        <h3 className="mt-7 font-display text-xl font-bold text-white">{course.title}</h3>
        <div className="mt-2 text-xs text-white/80">{label}</div>
      </div>

      <div className="space-y-4 p-5">
        <div className="text-xs text-muted-foreground">{brandLabel}</div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Full Course Access
          </div>
          <div className="mt-1 font-display text-xl font-bold text-foreground">
            {course.price === 0 ? "₦0" : formatNaira(course.price)}
          </div>
        </div>

        {typeof progress === "number" ? <ProgressBar value={progress} label={`${progress}% completed`} /> : null}

        <div className="text-xs text-muted-foreground">{label}</div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href={ctaHref ?? `/course/${course.id}`}>
              <Button variant="accent" size="sm">
                {ctaLabel}
              </Button>
            </Link>
            <Link
              href={previewHref ?? `/course/${course.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-accent"
            >
              Preview Course <ArrowRight className="h-4 w-4" />
            </Link>
            {secondaryAction && (
              <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
                <Heart className={`h-4 w-4 ${secondaryAction.active ? "fill-current" : ""}`} /> {secondaryAction.label}
              </Button>
            )}
            {continueHref && (
              <Link href={continueHref}>
                <Button variant="outline" size="sm">
                  <PlayCircle className="h-4 w-4" /> Continue Learning
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
