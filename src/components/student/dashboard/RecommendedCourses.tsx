"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { StudentCourseCard } from "@/components/student/StudentCourseCard";
import type { StudentCourse } from "@/lib/student";

interface RecommendedCoursesProps {
  courses: StudentCourse[];
  isLoading?: boolean;
}

export function RecommendedCourses({ courses, isLoading }: RecommendedCoursesProps) {
  if (!isLoading && courses.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for You
        </h2>
        <Link href="/dashboard/courses" className="text-xs font-semibold text-primary hover:underline">
          Browse All →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-[1.5rem] bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.slice(0, 3).map((course) => (
            <StudentCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
