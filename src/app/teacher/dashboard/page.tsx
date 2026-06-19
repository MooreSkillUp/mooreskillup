"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Trash2,
  Eye,
  FileEdit,
  LayoutList,
  Upload,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherDashboardPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { user } = useAuth();
  const { profile, stats, activities, teacherCourses, clearTeacherActivities, isLoading, error, changePassword } =
    useTeacherPlatform();
  const topCourse = [...teacherCourses].sort(
    (left, right) => right.analytics.enrollments - left.analytics.enrollments,
  )[0];
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promptMessage, setPromptMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user?.mustChangePassword) return;
    const dismissedKey = `mooreskillup.teacher-password-prompt.dismissed.${user.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(dismissedKey) === "true") return;
    setPasswordPromptOpen(true);
  }, [user?.id, user?.mustChangePassword]);

  const submitFirstLoginPassword = async () => {
    if (!newPassword.trim()) {
      setPromptMessage("Enter a new password to continue.");
      notifyError("Password required", "Enter a new password to continue.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPromptMessage("New password and confirm password must match.");
      notifyError("Password mismatch", "New password and confirm password must match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword("", newPassword);
      setPromptMessage("Password updated successfully.");
      setPasswordPromptOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      notifySuccess("Password updated successfully");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unable to update password.";
      setPromptMessage(message);
      notifyError("Unable to update password", message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const skipPasswordPrompt = () => {
    if (typeof window !== "undefined" && user?.id) {
      window.sessionStorage.setItem(`mooreskillup.teacher-password-prompt.dismissed.${user.id}`, "true");
    }
    setPasswordPromptOpen(false);
  };

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-8">
        {passwordPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <section className="w-full max-w-2xl rounded-[2rem] border border-primary/30 bg-card p-6 shadow-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                First login security
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold">Update your temporary password</h2>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                You can replace the temporary password now, or skip and continue using it until you use the forgot-password flow.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <PasswordInput
                  label="New password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <PasswordInput
                  label="Confirm password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="accent" onClick={submitFirstLoginPassword} loading={passwordSaving} loadingText="Saving password...">
                  Save new password
                </Button>
                <Button variant="outline" onClick={skipPasswordPrompt}>
                  Keep temporary password for now
                </Button>
              </div>
              {promptMessage && <p className="mt-3 text-sm text-success">{promptMessage}</p>}
            </section>
          </div>
        )}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Teacher dashboard
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">
              Welcome back, {profile.displayName}
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Manage your course pipeline, learner reach, draft progress, and recent instructor activity from one professional LMS workspace.
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: BookOpen, label: "Total Courses", value: `${stats.totalCourses}` },
            { icon: Upload, label: "Published Courses", value: `${stats.publishedCourses}` },
            { icon: FileEdit, label: "Draft Courses", value: `${stats.draftCourses}` },
            { icon: Activity, label: "Active Courses", value: `${stats.activeCourses}` },
            { icon: Users, label: "Total Learners", value: `${stats.totalLearners}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="mt-5 font-display text-3xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest actions from your teacher workspace. Entries auto-expire after 24 hours.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearTeacherActivities}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All Activities
                </button>
                <Link href="/teacher/uploads" className="text-sm font-semibold text-primary">
                  Open activity log
                </Link>
              </div>
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
                  Published and learner-visible courses currently count toward your active course total.
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
                    <span>{topCourse.analytics.views} views</span>
                    <span>{topCourse.analytics.enrollments} enrollments</span>
                    <span>{topCourse.analytics.completionRate}% completion</span>
                  </div>
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
              ) : (
                <div className="mt-4 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Create your first course to start tracking views and enrollments here.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
