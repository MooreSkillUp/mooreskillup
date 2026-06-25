"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Eye, FileClock, PencilLine, Upload, XCircle } from "lucide-react";
import { AdminPermissionGate } from "@/components/admin/AdminPermissionGate";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Textarea } from "@/components/ui/textarea";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform, type AdminCourse } from "@/lib/admin-platform";

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { courses, moderateCourse, isLoading, error } = useAdminPlatform();
  const reviewCourses = courses.filter((course) => course.status === "review");
  const approvedCourses = courses.filter((course) => course.status === "approved");
  const canEdit = hasUserPermission(user?.permissions, "courses:edit");
  const canApprove = hasUserPermission(user?.permissions, "courses:approve");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AdminCourse | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const confirmDecline = async () => {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      await moderateCourse(declineTarget.id, "decline", declineReason.trim() || undefined);
      notifySuccess("Course declined", "The teacher was emailed your note and can revise and resubmit.");
      setDeclineTarget(null);
      setDeclineReason("");
    } catch (actionError) {
      notifyError(
        "Unable to decline course",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setDeclining(false);
    }
  };

  const handleApprove = async (course: AdminCourse) => {
    setActionKey(`${course.id}:approve`);
    try {
      const updated = await moderateCourse(course.id, "approve");
      if (updated.status === "approved") {
        notifySuccess(
          "Course approved",
          "Second approval is enabled — an admin will publish this course next.",
        );
      } else {
        notifySuccess("Course published", "The course is now visible to students.");
      }
    } catch (actionError) {
      notifyError(
        "Unable to approve course",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setActionKey(null);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <AdminPermissionGate permissions={["courses:approve"]}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Course moderation
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Course review queue</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Review teacher submissions before they go live. Moderators can approve to a pending publish step when
              second approval is on; admins publish approved courses to students.
            </p>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            <MetricCard label="Awaiting review" value={`${reviewCourses.length}`} />
            <MetricCard label="Approved (publish next)" value={`${approvedCourses.length}`} />
            <MetricCard label="Published" value={`${courses.filter((course) => course.status === "published").length}`} />
            <MetricCard label="Declined" value={`${courses.filter((course) => course.status === "declined").length}`} />
          </div>

          {approvedCourses.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Ready to publish</h2>
              {approvedCourses.map((course) => (
                <CourseReviewCard
                  key={course.id}
                  course={course}
                  badge="Approved — publish next"
                  badgeClass="border-emerald-300 bg-emerald-50 text-emerald-900"
                  canEdit={canEdit}
                  canApprove={canApprove}
                  actionKey={actionKey}
                  onApprove={() => void handleApprove(course)}
                  onDecline={() => {
                    setDeclineTarget(course);
                    setDeclineReason("");
                  }}
                  approveLabel="Publish to students"
                  approveLoadingText="Publishing..."
                />
              ))}
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Pending review</h2>
            {reviewCourses.length ? (
              reviewCourses.map((course) => (
                <CourseReviewCard
                  key={course.id}
                  course={course}
                  badge="Review queue"
                  badgeClass="border-amber-300 bg-amber-50 text-amber-900"
                  canEdit={canEdit}
                  canApprove={canApprove}
                  actionKey={actionKey}
                  onApprove={() => void handleApprove(course)}
                  onDecline={() => {
                    setDeclineTarget(course);
                    setDeclineReason("");
                  }}
                  approveLabel="Approve"
                  approveLoadingText="Approving..."
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
                {isLoading ? "Loading pending reviews..." : "No courses are waiting for review right now."}
              </div>
            )}
          </section>
        </div>
      </AdminPermissionGate>

      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <h3 className="font-display text-xl font-bold">Decline “{declineTarget.title}”</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Tell the teacher what to fix. This note is emailed to them so they can revise and resubmit.
            </p>
            <Textarea
              className="mt-4 min-h-28 bg-background"
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="e.g. Section 2 videos are private — please make them unlisted."
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={declining}
                onClick={() => {
                  setDeclineTarget(null);
                  setDeclineReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                className="bg-destructive text-white hover:bg-destructive/90"
                loading={declining}
                loadingText="Declining..."
                onClick={() => void confirmDecline()}
              >
                Send decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function CourseReviewCard({
  course,
  badge,
  badgeClass,
  canEdit,
  canApprove,
  actionKey,
  onApprove,
  onDecline,
  approveLabel,
  approveLoadingText,
}: {
  course: AdminCourse;
  badge: string;
  badgeClass: string;
  canEdit: boolean;
  canApprove: boolean;
  actionKey: string | null;
  onApprove: () => void;
  onDecline: () => void;
  approveLabel: string;
  approveLoadingText: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-display text-2xl font-bold">{course.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Teacher: {course.teacherName} | {course.program} / {course.track}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">Status: {course.status}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
          {badge}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/admin/owned-courses/${course.id}/preview`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" /> Preview
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/admin/owned-courses/${course.id}/edit`}>
            <Button variant="outline" size="sm">
              <PencilLine className="h-4 w-4" /> Edit
            </Button>
          </Link>
        )}
        {canApprove && (
          <Button
            variant="accent"
            size="sm"
            loading={actionKey === `${course.id}:approve`}
            loadingText={approveLoadingText}
            onClick={onApprove}
          >
            <CheckCircle2 className="h-4 w-4" /> {approveLabel}
          </Button>
        )}
        {canApprove && (
          <Button variant="outline" size="sm" onClick={onDecline}>
            <XCircle className="h-4 w-4" /> Decline
          </Button>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <FileClock className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
