"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Compass, CreditCard, PlayCircle, Sparkles, Star } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { formatNaira, getCourseActionLabel, getPaymentMethodLabel } from "@/lib/commerce";
import { useAuth } from "@/lib/auth";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

type TabKey = "my-courses" | "explore-courses" | "payments";

export default function DashboardCoursesPage() {
  const { user, toggleWishlist } = useAuth();
  const {
    getCourseById,
    getDiscoverableCourses,
    getMyLearningCourses,
    getPurchasedCourses,
    getStartedLearningCourses,
    getStudentPayments,
    getStudentCourseProgress,
    getContinueLearningLessonId,
    getLastAccessedLessonTitle,
    isCourseOwnedByStudent,
    brandLabel,
  } = useTeacherWorkspace();
  const [activeTab, setActiveTab] = useState<TabKey>("my-courses");

  const myCourses = getMyLearningCourses();
  const purchasedCourses = getPurchasedCourses();
  const startedCourses = getStartedLearningCourses();
  const exploreCourses = getDiscoverableCourses();
  const payments = getStudentPayments();
  const watchlistCourses = useMemo(
    () =>
      (user?.wishlist ?? [])
        .map((courseId) => getCourseById(courseId))
        .filter((course): course is NonNullable<typeof course> => !!course),
    [getCourseById, user?.wishlist],
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Courses Tab
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold">Learn, explore, and keep your course pipeline moving</h1>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                Keep purchased courses, started courses, and watchlist picks organized in one structured learning flow.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "my-courses", label: "My Courses" },
            { id: "explore-courses", label: "Explore Courses" },
            { id: "payments", label: "Payments" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "my-courses" && (
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">Purchased Courses</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {purchasedCourses.length ? (
                  purchasedCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      label="Purchased course"
                      ctaLabel={getCourseActionLabel(course.price, true)}
                      ctaHref={`/course/${course.id}`}
                      progress={getStudentCourseProgress(course.id)}
                      continueHref={
                        getContinueLearningLessonId(course.id)
                          ? `/lesson/${getContinueLearningLessonId(course.id)}`
                          : null
                      }
                      brandLabel={brandLabel}
                    />
                  ))
                ) : (
                  <EmptyState text="Purchased courses will appear here after you unlock a paid course." />
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold">Started Courses</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {startedCourses.length ? (
                  startedCourses.map((course) => (
                    <div key={course.id} className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
                      <div className="font-display text-2xl font-bold">{course.title}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{brandLabel}</div>
                      <div className="mt-3 text-sm text-muted-foreground">
                        Last lesson accessed: {getLastAccessedLessonTitle(course.id) ?? "Start the first lesson"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Progress: {getStudentCourseProgress(course.id)}%
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={
                            getContinueLearningLessonId(course.id)
                              ? `/lesson/${getContinueLearningLessonId(course.id)}`
                              : `/course/${course.id}`
                          }
                          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                        >
                          Continue
                        </Link>
                        <Link
                          href={`/course/${course.id}`}
                          className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
                        >
                          Open Course
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Start a lesson and your active learning courses will appear here." />
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold">Watchlist</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {watchlistCourses.length ? (
                  watchlistCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      label={isCourseOwnedByStudent(course.id) ? "Ready to learn" : "Saved for later"}
                      ctaLabel={getCourseActionLabel(course.price, isCourseOwnedByStudent(course.id))}
                      ctaHref={
                        course.price === 0 || isCourseOwnedByStudent(course.id)
                          ? `/course/${course.id}`
                          : `/payment/${course.id}`
                      }
                      brandLabel={brandLabel}
                      secondaryAction={{
                        label: "Remove",
                        onClick: () => toggleWishlist(course.id),
                        active: true,
                      }}
                    />
                  ))
                ) : (
                  <EmptyState text="Save courses from Explore Courses or the course preview page to build your watchlist." />
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">All Learning Courses</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {myCourses.length ? (
                  myCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      label="Open Course"
                      ctaLabel={getCourseActionLabel(course.price, true)}
                      ctaHref={`/course/${course.id}`}
                      progress={getStudentCourseProgress(course.id)}
                      continueHref={
                        getContinueLearningLessonId(course.id)
                          ? `/lesson/${getContinueLearningLessonId(course.id)}`
                          : null
                      }
                      brandLabel={brandLabel}
                    />
                  ))
                ) : (
                  <EmptyState text="Your enrolled and purchased courses will appear here." />
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "explore-courses" && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Explore Courses</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {exploreCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  label={course.price === 0 ? "Free course" : "Paid course"}
                  ctaLabel={getCourseActionLabel(course.price, isCourseOwnedByStudent(course.id))}
                  ctaHref={
                    course.price === 0 || isCourseOwnedByStudent(course.id)
                      ? `/course/${course.id}`
                      : `/payment/${course.id}`
                  }
                  brandLabel={brandLabel}
                  secondaryAction={{
                    label: (user?.wishlist ?? []).includes(course.id) ? "Saved" : "Watchlist",
                    onClick: () => toggleWishlist(course.id),
                    active: (user?.wishlist ?? []).includes(course.id),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {activeTab === "payments" && (
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Payments</h2>
            </div>
            <div className="space-y-3">
              {payments.length ? (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{payment.courseTitle}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Amount paid: {formatNaira(payment.amount)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Method: {getPaymentMethodLabel(payment.paymentMethod)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">Date: {payment.paidAt}</div>
                    <div className="mt-1 text-sm text-emerald-600">Status: Successful</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No payments yet.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
