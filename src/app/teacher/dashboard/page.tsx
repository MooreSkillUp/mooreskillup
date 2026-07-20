"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  FileEdit,
  LayoutList,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { FirstLoginPasswordModal } from "@/components/shared/FirstLoginPasswordModal";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, stats, activities, teacherCourses, clearTeacherActivities, isLoading, error, changePassword } =
    useTeacherPlatform();
  const topCourse = [...teacherCourses].sort(
    (left, right) => right.analytics.enrollments - left.analytics.enrollments,
  )[0];
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

      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                  Teacher dashboard
                </div>
                <h1 className="mt-2 font-display text-4xl font-bold">
                  Welcome back, {profile.displayName}
                </h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Manage your course pipeline, learner reach, draft progress, and recent instructor activity from one
                  polished LMS workspace.
                </p>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
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
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border bg-background px-3 py-1.5">{stats.publishedCourses} published</span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">{stats.pendingReviewCourses} awaiting review</span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">{stats.totalLearners} learners enrolled</span>
            </div>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {[
            { icon: BookOpen, label: "Total courses", value: `${stats.totalCourses}` },
            { icon: Upload, label: "Published", value: `${stats.publishedCourses}` },
            { icon: FileEdit, label: "Drafts", value: `${stats.draftCourses}` },
            { icon: Activity, label: "Active (live)", value: `${stats.activeCourses}` },
            { icon: Clock3, label: "Awaiting review", value: `${stats.pendingReviewCourses}` },
            { icon: CheckCircle2, label: "Approved", value: `${stats.approvedCourses}` },
            { icon: XCircle, label: "Declined", value: `${stats.declinedCourses}` },
            { icon: Users, label: "Total learners", value: `${stats.totalLearners}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-2xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="mt-5 font-display text-3xl font-bold">{stats.completionRate}%</div>
            <div className="mt-1 text-sm text-muted-foreground">Overall completion rate</div>
            <p className="mt-2 text-xs text-muted-foreground">Across all enrollments in your courses.</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Eye className="h-6 w-6" />
            </div>
            <div className="mt-5 font-display text-3xl font-bold">{stats.totalViews}</div>
            <div className="mt-1 text-sm text-muted-foreground">Engaged learners</div>
            <p className="mt-2 text-xs text-muted-foreground">Enrolled students who have opened at least one lesson.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest actions from your workspace. Entries are kept for 30 days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void clearTeacherActivities()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="font-medium">{activity.message}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString("en-NG")}
                  </div>
                </div>
              ))}
              {!activities.length && (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading ? "Loading activity..." : "No recent activity yet."}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Course pipeline</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  {stats.pendingReviewCourses > 0
                    ? `${stats.pendingReviewCourses} course${stats.pendingReviewCourses === 1 ? "" : "s"} awaiting admin review.`
                    : "No courses are waiting for admin review right now."}
                </div>
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Drafts remain fully editable and continue auto-saving while you build.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Publishing is protected by content validation so incomplete courses do not go live accidentally.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Top course snapshot</h2>
              {topCourse ? (
                <div className="mt-4 rounded-2xl border border-border bg-background p-5">
                  <div className="font-display text-xl font-bold">{topCourse.title}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{topCourse.analytics.enrollments} enrollments</span>
                    <span>{topCourse.analytics.views} engaged learners</span>
                    <span>{topCourse.analytics.completionRate}% completion</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/teacher/courses/${topCourse.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Link href={`/teacher/courses/${topCourse.id}/preview`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" /> Preview
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Create your first course to start tracking enrollments and completion here.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
