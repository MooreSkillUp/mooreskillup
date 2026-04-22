"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, PencilLine, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useTeacherWorkspace, type TeacherCourseStatus } from "@/lib/teacher-workspace";

export default function TeacherCoursesPage() {
  const {
    teacherCourses,
    saveCourse,
    deleteCourse,
    getCourseById,
    getCategoryName,
    getSubcategoryName,
  } = useTeacherWorkspace();
  const [tab, setTab] = useState<TeacherCourseStatus>("published");

  const filteredCourses = useMemo(
    () => teacherCourses.filter((course) => course.status === tab),
    [teacherCourses, tab],
  );

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              My courses
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Course management</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Browse published courses, drafts, and archived work with instructor actions, analytics, and learner preview access.
            </p>
          </div>
          <Link href="/teacher/create-course">
            <Button variant="accent">
              <Upload className="h-4 w-4" /> Create course
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["published", "draft", "archived"] as const).map((value) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {value === "published" ? "Published" : value === "draft" ? "Drafts" : "Archived"}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredCourses.length ? (
            filteredCourses.map((course) => (
              <div key={course.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="font-display text-2xl font-bold">{course.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {course.status === "published" ? "Published" : course.status === "draft" ? "Draft" : "Archived"}{" "}
                      • {course.analytics.enrollments} learners • updated {course.lastUpdated}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {getCategoryName(course.categoryId)} /{" "}
                      {getSubcategoryName(course.categoryId, course.subcategoryId)} •{" "}
                      {course.sections.length} sections • {course.analytics.views} views • {course.track}
                    </div>
                  </div>
                  <div className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {course.status}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-background p-4 text-sm text-muted-foreground md:grid-cols-3">
                  <div>
                    <div>Views</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">
                      {course.analytics.views}
                    </div>
                  </div>
                  <div>
                    <div>Enrollments</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">
                      {course.analytics.enrollments}
                    </div>
                  </div>
                  <div>
                    <div>Completion</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">
                      {course.analytics.completionRate}%
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/teacher/courses/${course.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <PencilLine className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                  <Link href={`/teacher/courses/${course.id}/preview`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                  </Link>
                  {course.status === "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const found = getCourseById(course.id);
                        if (found) saveCourse(found, "unpublish");
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        const found = getCourseById(course.id);
                        if (found) saveCourse(found, "publish");
                      }}
                    >
                      Publish
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => deleteCourse(course.id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              No courses in this tab yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
