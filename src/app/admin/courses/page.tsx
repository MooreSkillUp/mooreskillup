"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { getAdminCourseRows } from "@/lib/mock-data";

export default function AdminCoursesPage() {
  const courses = getAdminCourseRows();

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-3xl font-bold">Admin courses view</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Read-only course visibility for admin review. Tutor name, price, and publication status
            stay visible here while course editing remains a teacher responsibility.
          </p>
        </div>

        <div className="grid gap-4">
          {courses.map((course) => (
            <div key={course.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-display text-2xl font-bold">{course.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Tutor: {course.tutorName} • ${course.price}
                  </div>
                </div>
                <div className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {course.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
