"use client";

import { motion } from "framer-motion";
import { BellRing, BookOpen, Compass, CreditCard, PlayCircle, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { CourseCard } from "../../components/dashboard/CourseCard";
import { Button } from "../../components/ui-kit/Button";
import { getCourseActionLabel } from "../../lib/commerce";
import { useAuth } from "../../lib/auth";
import { useTeacherWorkspace } from "../../lib/teacher-workspace";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    notifications,
    getMyLearningCourses,
    getStartedLearningCourses,
    getRecommendedCourses,
    getRecentLearningCourses,
    getContinueLearningCourse,
    getContinueLearningLessonId,
    getLastAccessedLessonTitle,
    getStudentCourseProgress,
    brandLabel,
  } = useTeacherWorkspace();

  const myCourses = getMyLearningCourses();
  const startedCourses = getStartedLearningCourses();
  const recommended = getRecommendedCourses();
  const recentCourses = getRecentLearningCourses().slice(0, 3);
  const continueCourse = getContinueLearningCourse();
  const continueLessonId = continueCourse ? getContinueLearningLessonId(continueCourse.id) : null;
  const selectedTracks =
    user?.selectedTracks?.length ? user.selectedTracks.join(", ") : user?.selectedTrack ?? "Learning";

  return (
    <AppShell>
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-primary-foreground shadow-lg sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-white/75">
                Student dashboard
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
                {user?.displayName}, keep learning and unlock more.
              </h1>
              <p className="mt-4 max-w-2xl text-white/85">
                Discover courses inside your academic path, pay once to unlock full access, and resume exactly where you stopped.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Stat icon={BookOpen} label="My courses" value={`${myCourses.length}`} />
                <Stat icon={Compass} label="Program" value={user?.selectedInterest ?? "Student"} />
                <Stat icon={Sparkles} label="Tracks" value={selectedTracks} />
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-black/15 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-white/70">
                Continue learning
              </div>
              <div className="mt-3 font-display text-2xl font-bold">
                {continueCourse?.title ?? "Choose a course to begin"}
              </div>
              <p className="mt-3 text-sm text-white/80">
                {continueCourse
                  ? `${getStudentCourseProgress(continueCourse.id)}% complete.`
                  : "Your next lesson will appear here once you start a course."}
              </p>
              <div className="mt-5 flex gap-3">
                {continueCourse && continueLessonId ? (
                  <Link href={`/lesson/${continueLessonId}`}>
                    <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                      Continue Learning
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard/courses">
                    <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                      Browse Courses
                    </Button>
                  </Link>
                )}
                <Link href="/dashboard/courses">
                  <Button variant="accent">My Courses</Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Continue Learning</h2>
            </div>
            <Link href="/dashboard/courses" className="text-sm font-semibold text-primary hover:text-accent">
              Open My Courses
            </Link>
          </div>
          {startedCourses.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {startedCourses.slice(0, 4).map((course) => {
                const continueId = getContinueLearningLessonId(course.id);
                return (
                  <div key={course.id} className="rounded-[1.5rem] border border-border bg-background p-5">
                    <div className="font-display text-xl font-bold">{course.title}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Last lesson accessed: {getLastAccessedLessonTitle(course.id) ?? "Start the first lesson"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Progress: {getStudentCourseProgress(course.id)}%
                    </div>
                    <div className="mt-4">
                      {continueId ? (
                        <Link href={`/lesson/${continueId}`}>
                          <Button variant="accent">Continue</Button>
                        </Link>
                      ) : (
                        <Link href={`/course/${course.id}`}>
                          <Button variant="accent">Continue</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Start a course and your learning continuity will appear here automatically.
            </div>
          )}
        </section>

        {recentCourses.length > 0 && (
          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Recently accessed</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {recentCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  label="Recently accessed"
                  ctaLabel={getCourseActionLabel(course.price, true)}
                  ctaHref={`/course/${course.id}`}
                  progress={getStudentCourseProgress(course.id)}
                  continueHref={getContinueLearningLessonId(course.id) ? `/lesson/${getContinueLearningLessonId(course.id)}` : null}
                  brandLabel={brandLabel}
                />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                    My Courses
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Purchased and started courses
                  </h2>
                </div>
                <Link href="/dashboard/courses" className="text-sm font-semibold text-primary hover:text-accent">
                  Open courses tab
                </Link>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {myCourses.slice(0, 2).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    label="Open Course"
                    ctaLabel={getCourseActionLabel(course.price, true)}
                    ctaHref={`/course/${course.id}`}
                    progress={getStudentCourseProgress(course.id)}
                    continueHref={getContinueLearningLessonId(course.id) ? `/lesson/${getContinueLearningLessonId(course.id)}` : null}
                    brandLabel={brandLabel}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold">Smart recommendations</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {recommended.slice(0, 2).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    label="Discoverable in your path"
                    ctaLabel={getCourseActionLabel(course.price, false)}
                    ctaHref={course.price === 0 ? `/course/${course.id}` : `/payment/${course.id}`}
                    brandLabel={brandLabel}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-accent" />
                <h2 className="font-display text-xl font-bold">Notifications</h2>
              </div>
              <div className="mt-4 space-y-3">
                {notifications.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Monetization flow</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  Preview free sections before purchase.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Pay once to unlock the full course.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Purchased courses move instantly into My Courses.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.2em] text-white/75">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
