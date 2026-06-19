"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, PencilLine, Upload } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform } from "@/lib/admin-platform";
import { formatNaira } from "@/lib/commerce";

export default function AdminOwnedCoursesPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { courses, isLoading, error, moderateCourse, updateCourseCatalog, publishAdminOwnedCourse } =
    useAdminPlatform();
  const adminOwnedCourses = courses.filter((course) => course.ownerType === "admin");
  const [actionKey, setActionKey] = useState<string | null>(null);

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Admin-owned courses
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Admin-owned course management</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            These are courses currently held by admin ownership. Edit content, preview learner flow, and publish, unpublish, archive, or restore without mixing them with the course structure settings page.
          </p>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: "Admin-owned courses", value: `${adminOwnedCourses.length}` },
            { label: "Published", value: `${adminOwnedCourses.filter((course) => course.status === "published").length}` },
            { label: "Archived", value: `${adminOwnedCourses.filter((course) => course.status === "archived").length}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
              <div className="mt-2 font-display text-3xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {adminOwnedCourses.length ? (
            adminOwnedCourses.map((course) => (
              <div key={course.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="font-display text-2xl font-bold">{course.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {course.program} / {course.track} | {course.status} | {formatNaira(Number(course.price))}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Visibility: {course.visibility} | Owner: Admin
                    </div>
                  </div>
                  <div className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {course.status}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/admin/owned-courses/${course.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <PencilLine className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/owned-courses/${course.id}/preview`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                  </Link>
                  {course.status === "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionKey === `${course.id}:unpublish`}
                      loadingText="Updating..."
                      onClick={async () => {
                        setActionKey(`${course.id}:unpublish`);
                        try {
                          await updateCourseCatalog(course.id, { status: "draft", visibility: "hidden" });
                          notifySuccess("Course moved to draft");
                        } catch (actionError) {
                          notifyError(
                            "Unable to update course",
                            actionError instanceof Error ? actionError.message : "Request failed.",
                          );
                        } finally {
                          setActionKey(null);
                        }
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      loading={actionKey === `${course.id}:publish`}
                      loadingText="Publishing..."
                      onClick={async () => {
                        setActionKey(`${course.id}:publish`);
                        try {
                          await publishAdminOwnedCourse(course.id);
                          notifySuccess("Course published", "The admin-owned course is now visible to students.");
                        } catch (actionError) {
                          notifyError(
                            "Unable to publish course",
                            actionError instanceof Error ? actionError.message : "Request failed.",
                          );
                        } finally {
                          setActionKey(null);
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" /> Publish
                    </Button>
                  )}
                  {course.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionKey === `${course.id}:restore`}
                      loadingText="Restoring..."
                      onClick={async () => {
                        setActionKey(`${course.id}:restore`);
                        try {
                          await moderateCourse(course.id, "restore");
                          notifySuccess("Course restored to draft");
                        } catch (actionError) {
                          notifyError(
                            "Unable to restore course",
                            actionError instanceof Error ? actionError.message : "Request failed.",
                          );
                        } finally {
                          setActionKey(null);
                        }
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={actionKey === `${course.id}:archive`}
                      loadingText="Archiving..."
                      onClick={async () => {
                        setActionKey(`${course.id}:archive`);
                        try {
                          await moderateCourse(course.id, "archive");
                          notifySuccess("Course archived");
                        } catch (actionError) {
                          notifyError(
                            "Unable to archive course",
                            actionError instanceof Error ? actionError.message : "Request failed.",
                          );
                        } finally {
                          setActionKey(null);
                        }
                      }}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              {isLoading ? "Loading admin-owned courses..." : "No courses are currently owned by admin."}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
