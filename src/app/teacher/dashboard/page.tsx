"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, LayoutList, Trash2, Upload, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { FirstLoginPasswordModal } from "@/components/shared/FirstLoginPasswordModal";
import { CoursePipeline } from "@/components/teacher/CoursePipeline";
import { TeacherWelcomeBanner } from "@/components/teacher/TeacherWelcomeBanner";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";
import { useTeacherPlatform } from "@/lib/teacher-platform";

/**
 * The teacher's home screen.
 *
 * It answers "what needs me?" before "how am I doing?" — the pipeline shows
 * where work is stuck, and the numbers above it are the four a teacher checks
 * rather than every count the API happens to return. Nothing here is invented:
 * a teacher with no courses sees zeros and an invitation, not a sample chart.
 */
export default function TeacherDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, stats, activities, teacherCourses, clearTeacherActivities, isLoading, error, changePassword } =
    useTeacherPlatform();
  const topCourse = [...teacherCourses].sort(
    (left, right) => right.analytics.enrollments - left.analytics.enrollments,
  )[0];
  const hasCourses = teacherCourses.length > 0;
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setPasswordPromptOpen(Boolean(user?.mustChangePassword));
  }, [authLoading, user?.mustChangePassword]);

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <FirstLoginPasswordModal
        open={passwordPromptOpen}
        roleLabel="teacher"
        onChangePassword={async (newPassword) => {
          await changePassword("", newPassword);
          setPasswordPromptOpen(false);
        }}
      />

      <div className="space-y-6">
        <TeacherWelcomeBanner
          name={profile.displayName}
          publishedCourses={stats.publishedCourses}
          totalLearners={stats.totalLearners}
          engagedLearners={stats.engagedLearners}
          completionRate={stats.completionRate}
          pendingReviewCourses={stats.pendingReviewCourses}
          declinedCourses={stats.declinedCourses}
          loading={isLoading}
        />

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/teacher/create-course">
            <Button variant="accent">
              <Upload className="h-4 w-4" /> Create course
            </Button>
          </Link>
          <Link href="/teacher/courses">
            <Button variant="outline">
              <LayoutList className="h-4 w-4" /> My courses
            </Button>
          </Link>
          <Link href="/teacher/students">
            <Button variant="outline">
              <Users className="h-4 w-4" /> My students
            </Button>
          </Link>
        </div>

        <CoursePipeline
          draft={stats.draftCourses}
          review={stats.pendingReviewCourses}
          approved={stats.approvedCourses}
          published={stats.publishedCourses}
          declined={stats.declinedCourses}
          loading={isLoading}
        />

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest actions from your workspace. Entries are kept for 30 days.
                </p>
              </div>
              {activities.length > 0 && (
                <button
                  type="button"
                  onClick={() => void clearTeacherActivities()}
                  className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 space-y-2.5">
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border bg-background p-3.5">
                  <div className="text-sm font-medium">{activity.message}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString("en-NG")}
                  </div>
                </div>
              ))}
              {!activities.length && (
                <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading activity…"
                    : "Nothing yet. Your edits and submissions will appear here."}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">
              {topCourse ? "Your busiest course" : "Getting started"}
            </h2>
            {topCourse ? (
              <>
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <div className="font-display text-lg font-bold">
                    {topCourse.title || "Untitled course"}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Enrolled", value: topCourse.analytics.enrollments },
                      { label: "Engaged", value: topCourse.analytics.engaged },
                      { label: "Completion", value: `${topCourse.analytics.completionRate}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-muted/50 px-2 py-2">
                        <dd className="font-display text-lg font-bold tabular-nums">{value}</dd>
                        <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/teacher/courses/${topCourse.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${topCourse.id}/preview`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" /> Preview
                      </Button>
                    </Link>
                  </div>
                </div>
                {/* Only shown once there is something to measure — a teacher on
                    day one does not need the vocabulary explained yet. */}
                <p className="mt-3 text-xs text-muted-foreground">
                  &quot;Engaged&quot; counts enrollments where at least one lesson has been opened.
                </p>
              </>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  {hasCourses
                    ? "Publish a course and its numbers will appear here."
                    : "Three steps to your first live course:"}
                </p>
                {!hasCourses && (
                  <ol className="space-y-2">
                    {[
                      "Create the course and write its description.",
                      "Add sections and lessons — the studio tells you what is still missing.",
                      "Submit for review. We check it, then it goes live.",
                    ].map((step, index) => (
                      <li key={step} className="flex gap-3 rounded-xl bg-muted/40 p-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                          {index + 1}
                        </span>
                        <span className="text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <Link href="/teacher/create-course">
                  <Button variant="accent" size="sm">
                    <Upload className="h-4 w-4" /> Create a course
                  </Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
