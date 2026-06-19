"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Eye, FileClock, XCircle } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform, type AdminCourse } from "@/lib/admin-platform";

export default function AdminReviewsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { courses, moderateCourse, isLoading, error } = useAdminPlatform();
  const reviewCourses = courses.filter((course) => course.status === "review");
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

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Course moderation
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Pending course reviews</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review teacher submissions before they go live to students. Approve to publish, decline to return for revisions, or archive to remove from the active pipeline.
          </p>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Awaiting review" value={`${reviewCourses.length}`} />
          <MetricCard label="Published" value={`${courses.filter((course) => course.status === "published").length}`} />
          <MetricCard label="Declined" value={`${courses.filter((course) => course.status === "declined").length}`} />
        </div>

        <div className="space-y-4">
          {reviewCourses.length ? (
            reviewCourses.map((course) => (
              <div key={course.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-display text-2xl font-bold">{course.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Teacher: {course.teacherName} | {course.program} / {course.track}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Status: In review. This course is hidden from students until approval.
                    </div>
                  </div>
                  <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">
                    Review queue
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/teacher/courses/${course.id}/preview`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                  </Link>
                  <Link href={`/teacher/courses/${course.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="accent"
                    size="sm"
                    loading={actionKey === `${course.id}:approve`}
                    loadingText="Approving..."
                    onClick={async () => {
                      setActionKey(`${course.id}:approve`);
                      try {
                        await moderateCourse(course.id, "approve");
                        notifySuccess("Course approved", "The course is now visible to students.");
                      } catch (actionError) {
                        notifyError(
                          "Unable to approve course",
                          actionError instanceof Error ? actionError.message : "Request failed.",
                        );
                      } finally {
                        setActionKey(null);
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeclineTarget(course);
                      setDeclineReason("");
                    }}
                  >
                    <XCircle className="h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              {isLoading ? "Loading pending reviews..." : "No courses are waiting for admin review right now."}
            </div>
          )}
        </div>
      </div>

      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <h3 className="font-display text-xl font-bold">Decline “{declineTarget.title}”</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Tell the teacher what to fix. This note is emailed to them and shown in their notifications so
              they can revise and resubmit.
            </p>
            <Textarea
              className="mt-4 min-h-28 bg-background"
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="e.g. Section 2 videos are private — please make them unlisted, and add a project brief."
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
