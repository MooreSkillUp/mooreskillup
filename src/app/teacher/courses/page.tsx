"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Eye, PencilLine, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform, type TeacherCourseStatus } from "@/lib/teacher-platform";

export default function TeacherCoursesPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { teacherCourses, saveCourse, deleteCourse, duplicateCourse, getCourseById, categories, archiveCourse, restoreCourse } =
    useTeacherPlatform();
  const [tab, setTab] = useState<TeacherCourseStatus>("published");
  const [actionCourseId, setActionCourseId] = useState<string | null>(null);

  const getCategoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "Unassigned category";
  const getSubcategoryName = (categoryId: string, subcategoryId: string) =>
    categories
      .find((category) => category.id === categoryId)
      ?.subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ?? "Unassigned track";

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

        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Archived courses are hidden from students but kept safely for later restoration and editing.
        </div>

        <div className="flex flex-wrap gap-2">
          {(["published", "review", "draft", "declined", "archived"] as const).map((value) => {
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
                {value === "published"
                  ? "Published"
                  : value === "review"
                    ? "In Review"
                    : value === "draft"
                      ? "Drafts"
                      : value === "declined"
                        ? "Declined"
                        : "Archived"}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredCourses.length ? (
            filteredCourses.map((course) => (
              <div key={course.id} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
                <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft px-6 py-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="font-display text-2xl font-bold">{course.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {course.status === "published"
                          ? "Published"
                          : course.status === "review"
                            ? "In review"
                            : course.status === "declined"
                              ? "Declined"
                              : course.status === "draft"
                                ? "Draft"
                                : "Archived"}{" "}
                        | {course.analytics.enrollments} learners | updated {new Date(course.lastUpdated).toLocaleString("en-NG")}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {getCategoryName(course.categoryId)} / {getSubcategoryName(course.categoryId, course.subcategoryId)} |{" "}
                        {course.sections.length} sections | {course.analytics.views} views | {course.track}
                      </div>
                    </div>
                    <div className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {course.status}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-background p-4 text-sm text-muted-foreground md:grid-cols-3">
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
                  <Button
                    variant="outline"
                    size="sm"
                    loading={actionCourseId === `${course.id}:duplicate`}
                    loadingText="Duplicating..."
                    onClick={async () => {
                      setActionCourseId(`${course.id}:duplicate`);
                      try {
                        await duplicateCourse(course.id);
                        notifySuccess("Course duplicated", "A draft copy was created.");
                      } catch (error) {
                        notifyError(
                          "Unable to duplicate",
                          error instanceof Error ? error.message : "Request failed.",
                        );
                      } finally {
                        setActionCourseId(null);
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </Button>
                  {course.status === "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionCourseId === `${course.id}:unpublish`}
                      loadingText="Updating..."
                      onClick={async () => {
                        const found = getCourseById(course.id);
                        if (found) {
                          setActionCourseId(`${course.id}:unpublish`);
                          try {
                            await saveCourse(found, "unpublish");
                            notifySuccess("Course moved to draft");
                          } catch (error) {
                            notifyError(
                              "Unable to update course",
                              error instanceof Error ? error.message : "Request failed.",
                            );
                          } finally {
                            setActionCourseId(null);
                          }
                        }
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      loading={actionCourseId === `${course.id}:publish`}
                      loadingText="Submitting..."
                      onClick={async () => {
                        const found = getCourseById(course.id);
                        if (found) {
                          setActionCourseId(`${course.id}:publish`);
                          try {
                            await saveCourse(found, "publish");
                            notifySuccess(
                              "Course submitted for review",
                              "An admin must approve it before students can see it.",
                            );
                          } catch (error) {
                            notifyError(
                              "Unable to submit course",
                              error instanceof Error ? error.message : "Request failed.",
                            );
                          } finally {
                            setActionCourseId(null);
                          }
                        }
                      }}
                    >
                      {course.status === "review" ? "Resubmit" : "Publish"}
                    </Button>
                  )}
                  {course.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionCourseId === `${course.id}:restore`}
                      loadingText="Restoring..."
                      onClick={async () => {
                        setActionCourseId(`${course.id}:restore`);
                        try {
                          await restoreCourse(course.id);
                          notifySuccess("Course restored to draft");
                        } catch (error) {
                          notifyError(
                            "Unable to restore course",
                            error instanceof Error ? error.message : "Request failed.",
                          );
                        } finally {
                          setActionCourseId(null);
                        }
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionCourseId === `${course.id}:archive`}
                      loadingText="Archiving..."
                      onClick={async () => {
                        setActionCourseId(`${course.id}:archive`);
                        try {
                          await archiveCourse(course.id);
                          notifySuccess("Course archived");
                        } catch (error) {
                          notifyError(
                            "Unable to archive course",
                            error instanceof Error ? error.message : "Request failed.",
                          );
                        } finally {
                          setActionCourseId(null);
                        }
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  {course.pendingDeletion ? (
                    <span className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
                      <Trash2 className="h-3.5 w-3.5" /> Deletion pending admin approval
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionCourseId === `${course.id}:delete`}
                      loadingText="Requesting..."
                      onClick={async () => {
                        if (!window.confirm(`Request deletion of "${course.title || "this course"}"? An admin must approve it.`)) return;
                        setActionCourseId(`${course.id}:delete`);
                        try {
                          await deleteCourse(course.id);
                          notifySuccess("Deletion requested", "An admin will review your request.");
                        } catch (error) {
                          notifyError(
                            "Unable to request deletion",
                            error instanceof Error ? error.message : "Request failed.",
                          );
                        } finally {
                          setActionCourseId(null);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Request deletion
                    </Button>
                  )}
                  </div>
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
