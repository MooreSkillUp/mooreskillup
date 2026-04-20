"use client";

import { AppShell } from "../../components/dashboard/AppShell";
import { CourseCard } from "../../components/dashboard/CourseCard";
import { courses } from "../../lib/mock-data";

export default function CoursesPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">All courses</h1>
        <p className="mt-1 text-muted-foreground">Browse your enrolled learning tracks.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </AppShell>
  );
}