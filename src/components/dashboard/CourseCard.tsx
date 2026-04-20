import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Course } from "../../lib/mock-data";
import { ProgressBar } from "../ui-kit/ProgressBar";

export function CourseCard({ course }: { course: Course }) {
  const pct = Math.round((course.completedLessons / course.totalLessons) * 100);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className={`relative h-32 bg-gradient-to-br ${course.cover} p-5`}>
        <BookOpen className="absolute right-4 top-4 h-12 w-12 text-white/20" />
        <div className="text-xs font-medium uppercase tracking-wider text-white/80">
          {course.modules.length} modules · {course.totalLessons} lessons
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-white">{course.title}</h3>
      </div>
      <div className="space-y-4 p-5">
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <ProgressBar value={pct} label="Your progress" />
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">by {course.instructor}</span>
          <Link
            href={`/course/${course.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-accent"
          >
            Open <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
