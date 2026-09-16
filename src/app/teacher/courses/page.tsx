"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Eye, PencilLine, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { CourseBanner } from "@/components/course/CourseBanner";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform, type TeacherCourseStatus } from "@/lib/teacher-platform";
import { cn } from "@/lib/utils";

const TABS = ["published", "review", "approved", "draft", "declined", "archived"] as const;

const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  published: "Published",
  review: "In review",
  approved: "Approved",
  draft: "Drafts",
  declined: "Declined",
  archived: "Archived",
};

/** What each tab means, shown once above the list instead of as a standing notice. */
const TAB_NOTE: Record<(typeof TABS)[number], string> = {
  published: "Live to students right now.",
  review: "With the review team. You can still preview, but not edit.",
  approved: "Cleared by review and ready to go live.",
  draft: "Only you can see these. They save as you write.",
  // True as of the reviewer's note being stored on the course. Before that it
  // promised notes that existed only in an email nobody received.
  declined: "Sent back by the reviewer. Their note is on each course — fix it and resubmit.",
  archived: "Hidden from students and kept safely. Restore any time.",
};

// The badge sits on the course artwork, which can be any colour. A translucent
// tint vanished completely — a red "Declined" on an orange banner was
// unreadable — so the badge is a solid surface and the status colour is the text.
const STATUS_BADGE: Record<(typeof TABS)[number], string> = {
  published: "bg-background/95 text-success",
  review: "bg-background/95 text-warning",
  approved: "bg-background/95 text-success",
  draft: "bg-background/95 text-muted-foreground",
  declined: "bg-background/95 text-destructive",
  archived: "bg-background/95 text-muted-foreground",
};

/** `?status=draft` so the dashboard pipeline can link straight to a tab. */
function initialTab(value: string | null): TeacherCourseStatus {
  return (TABS as readonly string[]).includes(value ?? "")
    ? (value as TeacherCourseStatus)
    : "published";
}

/** "08/09/2026" — the seconds in a course's last-edit time helped nobody. */
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherCoursesPage() {
  // useSearchParams needs a Suspense boundary during static rendering.
  return (
    <Suspense fallback={null}>
      <TeacherCoursesView />
    </Suspense>
  );
}

function TeacherCoursesView() {
  const { notifyError, notifySuccess } = useFeedback();
  const {
    teacherCourses,
    saveCourse,
    deleteCourse,
    duplicateCourse,
    getCourseById,
    categories,
    archiveCourse,
    restoreCourse,
  } = useTeacherPlatform();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TeacherCourseStatus>(() =>
    initialTab(searchParams.get("status")),
  );
  const [actionCourseId, setActionCourseId] = useState<string | null>(null);

  const getCategoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "Unassigned category";
  const getSubcategoryName = (categoryId: string, subcategoryId: string) =>
    categories
      .find((category) => category.id === categoryId)
      ?.subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ??
    "Unassigned track";

  const filteredCourses = useMemo(
    () => teacherCourses.filter((course) => course.status === tab),
    [teacherCourses, tab],
  );

  const counts = useMemo(() => {
    const empty = Object.fromEntries(TABS.map((value) => [value, 0])) as Record<
      (typeof TABS)[number],
      number
    >;
    for (const course of teacherCourses) {
      if (course.status in empty) empty[course.status as (typeof TABS)[number]] += 1;
    }
    return empty;
  }, [teacherCourses]);

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My courses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every course you own, grouped by where it is in the pipeline.
            </p>
          </div>
          <Link href="/teacher/create-course" className="shrink-0">
            <Button variant="accent">
              <Upload className="h-4 w-4" /> Create course
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((value) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground",
                )}
              >
                {TAB_LABEL[value]}
                {/* The count on the tab, so a teacher can see at a glance
                    which pile has work in it without clicking through six. */}
                <span
                  className={cn(
                    "ml-2 tabular-nums",
                    active ? "text-accent-foreground/70" : "text-muted-foreground/60",
                  )}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">{TAB_NOTE[tab as (typeof TABS)[number]]}</p>

        {filteredCourses.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCourses.map((course) => {
              const busy = (action: string) => actionCourseId === `${course.id}:${action}`;
              const category = getCategoryName(course.categoryId);

              return (
                <article
                  key={course.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {/* The student's own artwork, so a teacher never has to guess
                      which course a row refers to — or how it looks in the
                      catalog. Same component the catalog card uses. */}
                  <div className="relative">
                    <CourseBanner
                      title=""
                      category={category}
                      bannerImage={course.bannerImage}
                      bannerTheme={course.bannerTheme}
                      className="min-h-[88px] rounded-none"
                    />
                    <span
                      className={cn(
                        "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm",
                        STATUS_BADGE[course.status as (typeof TABS)[number]] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {TAB_LABEL[course.status as (typeof TABS)[number]] ?? course.status}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <h2 className="font-display text-lg font-bold leading-snug">
                      {course.title || "Untitled course"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category} · {getSubcategoryName(course.categoryId, course.subcategoryId)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {course.sections.length} {course.sections.length === 1 ? "section" : "sections"}
                      {" · edited "}
                      {formatDay(course.lastUpdated)}
                    </p>

                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Enrolled", value: course.analytics.enrollments },
                        { label: "Engaged", value: course.analytics.engaged },
                        { label: "Completion", value: `${course.analytics.completionRate}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-muted/50 px-2 py-2">
                          <dd className="font-display text-lg font-bold tabular-nums">{value}</dd>
                          <dt className="text-[11px] text-muted-foreground">{label}</dt>
                        </div>
                      ))}
                    </dl>

                    {course.status === "declined" && course.declineReason && (
                      <p className="mt-3 line-clamp-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <span className="font-semibold">Reviewer: </span>
                        {course.declineReason}
                      </p>
                    )}

                    {course.pendingDeletion && (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Deletion requested — waiting on an admin.
                      </p>
                    )}

                    {/* Everyday actions on one row; the two that change who can
                        see the course, then the destructive one, separated
                        below so Archive is never a slip of the hand. */}
                    <div className="mt-auto space-y-2 pt-4">
                      <div className="flex flex-wrap gap-2">
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
                          loading={busy("duplicate")}
                          loadingText="Duplicating…"
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
                            loading={busy("unpublish")}
                            loadingText="Updating…"
                            onClick={async () => {
                              const found = getCourseById(course.id);
                              if (!found) return;
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
                            }}
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            variant="accent"
                            size="sm"
                            loading={busy("publish")}
                            loadingText="Submitting…"
                            onClick={async () => {
                              const found = getCourseById(course.id);
                              if (!found) return;
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
                            }}
                          >
                            {course.status === "review" ? "Resubmit" : "Submit for review"}
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                        {course.status === "archived" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busy("restore")}
                            loadingText="Restoring…"
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
                            variant="ghost"
                            size="sm"
                            loading={busy("archive")}
                            loadingText="Archiving…"
                            onClick={async () => {
                              setActionCourseId(`${course.id}:archive`);
                              try {
                                await archiveCourse(course.id);
                                notifySuccess(
                                  "Course archived",
                                  "Students can no longer see it. Restore any time.",
                                );
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

                        {!course.pendingDeletion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            loading={busy("delete")}
                            loadingText="Requesting…"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Request deletion of "${course.title || "this course"}"? An admin must approve it.`,
                                )
                              )
                                return;
                              setActionCourseId(`${course.id}:delete`);
                              try {
                                await deleteCourse(course.id);
                                notifySuccess(
                                  "Deletion requested",
                                  "An admin will review your request.",
                                );
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
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {tab === "published"
                ? "Nothing live yet. Submit a course for review to get started."
                : `No courses are ${TAB_LABEL[tab as (typeof TABS)[number]].toLowerCase()}.`}
            </p>
            {tab === "published" && (
              <Link href="/teacher/create-course" className="mt-4 inline-block">
                <Button variant="accent" size="sm">
                  <Upload className="h-4 w-4" /> Create a course
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
