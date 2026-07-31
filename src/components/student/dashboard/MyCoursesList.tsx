"use client";

import Link from "next/link";
import { BookOpen, Compass, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { StudentCourseCard } from "@/components/student/StudentCourseCard";
import type { StudentDashboard } from "@/lib/student";

type RecentCourse = StudentDashboard["recentCourses"][number];

interface MyCoursesListProps {
  courses: RecentCourse[];
  isLoading?: boolean;
}

export function MyCoursesList({ courses, isLoading }: MyCoursesListProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          Your Courses
        </h2>
        <Link href="/dashboard/courses" className="text-xs font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-[1.5rem] bg-muted/40" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-3 font-display text-xl font-bold">Start your first course</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the catalog and enroll — free courses unlock instantly.
          </p>
          <Link href="/dashboard/courses" className="mt-5 inline-block">
            <Button variant="accent" className="rounded-full">
              <Compass className="h-4 w-4" /> Browse courses
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <StudentCourseCard
              key={course.id}
              course={course}
              enrollment={{
                enrollmentId: course.enrollmentId,
                course: course,
                status: course.enrollmentStatus as "active" | "completed" | "revoked",
                progressPercent: course.progressPercent,
                lastLessonId: course.lastLessonId,
                enrolledAt: "",
                lastAccessedAt: null,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
