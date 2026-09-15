"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, PencilLine, RotateCcw, XCircle } from "lucide-react";
import { AdminPermissionGate } from "@/components/admin/AdminPermissionGate";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Textarea } from "@/components/ui/textarea";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform, type AdminCourse, type AdminReviewSummary } from "@/lib/admin-platform";
import { cn } from "@/lib/utils";

/** Long enough to say what is wrong; short enough not to be a chore. */
const MIN_REASON_LENGTH = 15;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "Waiting 3 days" — how long a teacher has been left without an answer. */
function waitLabel(iso?: string | null) {
  // Courses submitted before submission time was recorded have no timestamp.
  // Saying so is better than inventing an age for them.
  if (!iso) return "Submitted before timing was recorded";
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "Submitted just now";
  if (hours < 24) return `Waiting ${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return `Waiting ${plural(days, "day")}`;
}

function shortDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "";
}

/**
 * The course review queue — the one screen every course passes through to go live.
 *
 * Built around the reviewer's actual job: see what is waiting and for how long,
 * check the course without opening every lesson, and — when it isn't ready —
 * say exactly what to fix.
 *
 * That last part was broken. A decline reason was optional, was sent only by
 * email (which production had never sent), and was stored nowhere, so a teacher
 * whose course came back saw "Declined" and no explanation. The reason is
 * required now and lives on the course, where the teacher does the fixing.
 */
export default function AdminReviewsPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { courses, moderateCourse, isLoading, error } = useAdminPlatform();
  const canEdit = hasUserPermission(user?.permissions, "courses:edit");
  const canApprove = hasUserPermission(user?.permissions, "courses:approve");
  const canDecline = hasUserPermission(user?.permissions, "courses:decline");

  const [actionKey, setActionKey] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AdminCourse | null>(null);

  const { waiting, readyToPublish, withTeachers, resubmissions } = useMemo(() => {
    const byStatus = (status: string) => courses.filter((course) => course.status === status);

    // Oldest submission first — a queue, not a feed. Courses with no recorded
    // submission time predate the timestamp, so they are the oldest of all.
    const queue = byStatus("review").sort((a, b) => {
      if (!a.submittedAt) return -1;
      if (!b.submittedAt) return 1;
      return +new Date(a.submittedAt) - +new Date(b.submittedAt);
    });

    const declined = byStatus("declined").sort(
      (a, b) => +new Date(b.reviewedAt ?? 0) - +new Date(a.reviewedAt ?? 0),
    );

    return {
      waiting: queue,
      readyToPublish: byStatus("approved"),
      withTeachers: declined,
      resubmissions: queue.filter((course) => course.declineReason).length,
    };
  }, [courses]);

  const approve = async (course: AdminCourse) => {
    setActionKey(`${course.id}:approve`);
    try {
      const updated = await moderateCourse(course.id, "approve");
      if (updated.status === "approved") {
        notifySuccess("Approved", "Second approval is on — an admin publishes it next.");
      } else {
        notifySuccess("Published", `“${course.title}” is live for students.`);
      }
    } catch (actionError) {
      notifyError(
        "Could not approve",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setActionKey(null);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <AdminPermissionGate permissions={["courses:approve"]}>
        <div className="space-y-8">
          <header>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Course reviews</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every teacher course comes through here before students can see it. Oldest
              submissions are at the top.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </header>

          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Waiting for review" value={waiting.length} emphasis={waiting.length > 0} />
            <Stat
              label="Oldest waiting"
              value={waiting.length ? waitLabel(waiting[0].submittedAt).replace("Waiting ", "") : "—"}
            />
            <Stat label="Resubmissions" value={resubmissions} hint="Sent back once already" />
            <Stat label="With teachers" value={withTeachers.length} hint="Sent back, not yet resubmitted" />
          </dl>

          {readyToPublish.length > 0 && (
            <section className="space-y-3">
              <SectionHeading title="Ready to publish" count={readyToPublish.length}>
                Approved by a moderator. Publishing makes the course visible to students.
              </SectionHeading>
              {readyToPublish.map((course) => (
                <ReviewCard
                  key={course.id}
                  course={course}
                  canEdit={canEdit}
                  canApprove={canApprove}
                  canDecline={canDecline}
                  approving={actionKey === `${course.id}:approve`}
                  approveLabel="Publish to students"
                  onApprove={() => void approve(course)}
                  onDecline={() => setDeclineTarget(course)}
                />
              ))}
            </section>
          )}

          <section className="space-y-3">
            <SectionHeading title="Waiting for review" count={waiting.length} />
            {waiting.length ? (
              waiting.map((course) => (
                <ReviewCard
                  key={course.id}
                  course={course}
                  canEdit={canEdit}
                  canApprove={canApprove}
                  canDecline={canDecline}
                  approving={actionKey === `${course.id}:approve`}
                  approveLabel="Approve"
                  onApprove={() => void approve(course)}
                  onDecline={() => setDeclineTarget(course)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/60" />
                <p className="mt-2 font-medium">
                  {isLoading ? "Loading the queue…" : "Nothing waiting"}
                </p>
                {!isLoading && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Courses appear here the moment a teacher submits one.
                  </p>
                )}
              </div>
            )}
          </section>

          {withTeachers.length > 0 && (
            <section className="space-y-3">
              <SectionHeading title="With teachers" count={withTeachers.length}>
                Sent back for changes. They return to the queue when the teacher resubmits.
              </SectionHeading>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {withTeachers.slice(0, 8).map((course) => (
                  <li key={course.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{course.title || "Untitled course"}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {course.declineReason || "No note recorded — sent back before notes were kept."}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {course.teacherName}
                      {course.reviewedAt ? ` · ${shortDate(course.reviewedAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              {withTeachers.length > 8 && (
                <p className="text-xs text-muted-foreground">
                  and {plural(withTeachers.length - 8, "more course")}.
                </p>
              )}
            </section>
          )}
        </div>
      </AdminPermissionGate>

      {declineTarget && (
        <DeclineDialog
          course={declineTarget}
          onCancel={() => setDeclineTarget(null)}
          onSend={async (reason) => {
            await moderateCourse(declineTarget.id, "decline", reason);
            notifySuccess(
              "Sent back to the teacher",
              "Your note is on the course in their studio.",
            );
            setDeclineTarget(null);
          }}
          onError={(message) => notifyError("Could not send it back", message)}
        />
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string | number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums",
          emphasis && "text-accent",
        )}
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-baseline gap-2 font-display text-lg font-semibold">
        {title}
        <span className="text-sm font-normal tabular-nums text-muted-foreground">{count}</span>
      </h2>
      {children && <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

function ReviewCard({
  course,
  canEdit,
  canApprove,
  canDecline,
  approving,
  approveLabel,
  onApprove,
  onDecline,
}: {
  course: AdminCourse;
  canEdit: boolean;
  canApprove: boolean;
  canDecline: boolean;
  approving: boolean;
  approveLabel: string;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const isResubmission = course.status === "review" && Boolean(course.declineReason);

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold leading-snug">
              {course.title || "Untitled course"}
            </h3>
            {isResubmission && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                <RotateCcw className="h-3 w-3" /> Resubmitted
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {course.teacherName || "Admin-owned"} · {course.program} · {course.track}
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium text-muted-foreground">
          {waitLabel(course.submittedAt)}
        </p>
      </div>

      {/* On a resubmission, what was asked for last time — otherwise the reviewer
          has no way to check the teacher actually answered it. */}
      {isResubmission && (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground">
            Last time{course.reviewedByName ? `, ${course.reviewedByName}` : ""} asked for
            {course.reviewedAt ? ` · ${shortDate(course.reviewedAt)}` : ""}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-sm">{course.declineReason}</p>
        </div>
      )}

      <ReviewFacts summary={course.reviewSummary} certificateEnabled={course.certificateEnabled} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/owned-courses/${course.id}/preview`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" /> Preview as a student
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/admin/owned-courses/${course.id}/edit`}>
            <Button variant="ghost" size="sm">
              <PencilLine className="h-4 w-4" /> Edit
            </Button>
          </Link>
        )}
        <span className="flex-1" />
        {canDecline && (
          <Button variant="outline" size="sm" onClick={onDecline}>
            <XCircle className="h-4 w-4" /> Send back
          </Button>
        )}
        {canApprove && (
          <Button
            variant="accent"
            size="sm"
            loading={approving}
            loadingText="Working…"
            onClick={onApprove}
          >
            <CheckCircle2 className="h-4 w-4" /> {approveLabel}
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * The facts a reviewer would otherwise open every lesson to find.
 *
 * Problems first, then what is in order. Nothing here blocks approval — a
 * reviewer may have good reason to approve a course with no banner — but
 * nothing here should come as a surprise after it goes live either.
 */
function ReviewFacts({
  summary,
  certificateEnabled,
}: {
  summary?: AdminReviewSummary | null;
  certificateEnabled?: boolean;
}) {
  if (!summary) return null;

  const problems: string[] = [];
  const fine: string[] = [];

  if (summary.lessons === 0) problems.push("No published lessons");
  else fine.push(`${plural(summary.sections, "section")} · ${plural(summary.lessons, "lesson")}`);

  if (summary.emptyLessons) problems.push(`${plural(summary.emptyLessons, "lesson")} with no content`);
  else if (summary.lessons) fine.push("Every lesson has content");

  if (summary.lessonsWithoutDuration) {
    problems.push(`${plural(summary.lessonsWithoutDuration, "lesson")} with no length set`);
  } else if (summary.totalMinutes) {
    const hours = Math.floor(summary.totalMinutes / 60);
    const minutes = summary.totalMinutes % 60;
    fine.push(hours ? `${hours}h${minutes ? ` ${minutes}m` : ""} total` : `${minutes}m total`);
  }

  // An unready quiz is skipped by progression rather than blocking students,
  // so it is not dangerous — but the teacher believes it is being enforced.
  if (summary.unreadyQuizzes) {
    const quizzes = summary.unreadyQuizzes === 1 ? "1 quiz" : `${summary.unreadyQuizzes} quizzes`;
    problems.push(`${quizzes} published but not answerable`);
  }

  if (certificateEnabled) {
    if (summary.hasReadyFinal) fine.push("Certificate gated by a final assessment");
    else problems.push("Certificate on, no final assessment — issued for finishing lessons alone");
  }

  if (!summary.hasOverview) problems.push("No course overview");
  if (!summary.hasBanner) problems.push("No banner image");

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {problems.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" /> {item}
        </li>
      ))}
      {fine.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
        >
          <CheckCircle2 className="h-3 w-3 shrink-0 text-success" /> {item}
        </li>
      ))}
    </ul>
  );
}

function DeclineDialog({
  course,
  onCancel,
  onSend,
  onError,
}: {
  course: AdminCourse;
  onCancel: () => void;
  onSend: (reason: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, sending]);

  const send = async () => {
    if (tooShort) return;
    setSending(true);
    try {
      await onSend(trimmed);
    } catch (sendError) {
      onError(sendError instanceof Error ? sendError.message : "Request failed.");
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !sending && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="decline-title" className="font-display text-lg font-bold">
          Send “{course.title || "this course"}” back
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Say what needs to change. Your note appears on the course in{" "}
          {course.teacherName || "the teacher"}&apos;s studio, and again to whoever reviews it
          when they resubmit.
        </p>

        <label htmlFor="decline-reason" className="mt-4 block text-sm font-medium">
          What should the teacher change?
        </label>
        <Textarea
          id="decline-reason"
          className="mt-1.5 min-h-32 bg-background"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Lessons 3 and 4 in Section 2 have no video. The overview doesn't say who the course is for."
          autoFocus
        />
        <p className={cn("mt-1 text-xs", tooShort ? "text-muted-foreground" : "text-success")}>
          {tooShort
            ? `Be specific — at least ${MIN_REASON_LENGTH} characters (${trimmed.length} so far).`
            : "Specific enough to act on."}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={sending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="accent"
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={tooShort}
            loading={sending}
            loadingText="Sending…"
            onClick={() => void send()}
          >
            Send back
          </Button>
        </div>
      </div>
    </div>
  );
}
