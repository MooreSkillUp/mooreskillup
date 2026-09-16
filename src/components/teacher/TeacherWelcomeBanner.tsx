"use client";

import { BookOpen, GraduationCap, TrendingUp, Users } from "lucide-react";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The top of the teacher's dashboard, matching the student's.
 *
 * It used to be a pale gradient card while students got the brand banner, so
 * the two halves of the same product looked like two products. Teachers are
 * the ones we are about to onboard; the first screen they see should not be
 * the older-looking one.
 *
 * Four figures, not ten. The old grid showed Total courses, Published and
 * Active side by side — the same number three times for most teachers — plus
 * five statuses that are zero until something goes wrong. Counts by status
 * belong in the pipeline below, where they mean something; these four are the
 * ones a teacher actually checks.
 */
export function TeacherWelcomeBanner({
  name,
  publishedCourses = 0,
  totalLearners = 0,
  engagedLearners = 0,
  completionRate = 0,
  pendingReviewCourses = 0,
  declinedCourses = 0,
  loading,
}: {
  name?: string;
  publishedCourses?: number;
  totalLearners?: number;
  engagedLearners?: number;
  completionRate?: number;
  pendingReviewCourses?: number;
  declinedCourses?: number;
  loading?: boolean;
}) {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "there";

  // Says the most useful true thing, in the order a teacher would want to
  // hear it: a problem first, then work in flight, then how it is going.
  const subtitle = loading
    ? ""
    : declinedCourses > 0
      ? `${declinedCourses} course${declinedCourses === 1 ? " needs" : "s need"} changes before it can go live.`
      : pendingReviewCourses > 0
        ? `${pendingReviewCourses} course${pendingReviewCourses === 1 ? " is" : "s are"} with the review team.`
        : publishedCourses === 0
          ? "Build your first course — we'll walk you through it step by step."
          : totalLearners === 0
            ? "Your courses are live. Enrollments will show up here."
            : "Here's how your courses are doing.";

  const stats = [
    { label: "Published", value: String(publishedCourses), icon: BookOpen },
    { label: "Learners", value: String(totalLearners), icon: Users },
    { label: "Engaged", value: String(engagedLearners), icon: GraduationCap },
    { label: "Completion", value: `${completionRate}%`, icon: TrendingUp },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-accent text-white">
      <div className="relative p-5 sm:p-7">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/75">{greeting()},</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-white/80">{subtitle}</p>}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur-sm ring-1 ring-inset ring-white/15"
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </dt>
              <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
                {loading ? (
                  <span className="inline-block h-5 w-10 animate-pulse rounded bg-white/25" />
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
