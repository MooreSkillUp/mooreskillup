"use client";

import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Compass, GraduationCap, PlayCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { CommunityLinks } from "@/components/dashboard/CommunityLinks";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { StudentCourseCard } from "@/components/student/StudentCourseCard";
import { useAuth } from "@/lib/auth";
import { useRecommended, useStudentDashboard } from "@/lib/student";

export default function DashboardPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { data, isLoading } = useStudentDashboard(isStudent);
  const { courses: recommended } = useRecommended(isStudent);

  const stats = data?.stats;
  const cont = data?.continueLearning;

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-8">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Dashboard</div>
          <h1 className="mt-2 font-display text-4xl font-bold">
            Welcome back, {user?.displayName?.split(" ")[0] ?? "learner"} 👋
          </h1>
          <p className="mt-2 text-muted-foreground">Keep your momentum going.</p>
        </div>

        {/* Continue learning */}
        {cont && (
          <div className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-r from-primary/10 via-background to-accent-soft p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Continue learning</div>
                <h2 className="mt-1 font-display text-2xl font-bold">{cont.courseTitle}</h2>
                <div className="mt-3 max-w-md">
                  <ProgressBar value={cont.progressPercent} label={`${Math.round(cont.progressPercent)}% complete`} />
                </div>
              </div>
              <Link href={cont.lessonId ? `/lesson/${cont.lessonId}` : `/course/${cont.courseId}`}>
                <Button variant="accent" size="lg">
                  <PlayCircle className="h-4 w-4" /> Resume
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} label="Enrolled" value={stats?.enrolled ?? 0} loading={isLoading} />
          <StatCard icon={PlayCircle} label="In progress" value={stats?.inProgress ?? 0} loading={isLoading} />
          <StatCard icon={CheckCircle2} label="Completed" value={stats?.completed ?? 0} loading={isLoading} />
          <StatCard icon={Award} label="Certificates" value={stats?.certificates ?? 0} loading={isLoading} />
        </div>

        {/* Program community */}
        <CommunityLinks />

        {/* Recent courses */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Your courses</h2>
            <Link href="/dashboard/courses" className="text-sm font-semibold text-primary">
              View all →
            </Link>
          </div>
          {isLoading ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : !data?.recentCourses.length ? (
            <div className="mt-4 rounded-[2rem] border border-dashed border-border bg-card p-10 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-xl font-bold">Start your first course</h3>
              <p className="mt-1 text-sm text-muted-foreground">Browse the catalog and enroll — free courses unlock instantly.</p>
              <Link href="/dashboard/courses" className="mt-4 inline-block">
                <Button variant="accent">
                  <Compass className="h-4 w-4" /> Browse courses
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.recentCourses.map((course) => (
                <Link
                  key={course.id}
                  href={course.lastLessonId ? `/lesson/${course.lastLessonId}` : `/course/${course.id}`}
                  className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30"
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {course.level}
                  </div>
                  <div className="mt-1 line-clamp-2 font-display text-lg font-bold">{course.title}</div>
                  <div className="mt-3">
                    <ProgressBar value={course.progressPercent} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{Math.round(course.progressPercent)}% complete</span>
                    <span className="font-semibold text-primary">
                      {course.status === "completed" ? "Completed" : course.progressPercent > 0 ? "Continue" : "Start"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recommended */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Sparkles className="h-5 w-5 text-primary" /> Recommended for you
              </h2>
              <Link href="/dashboard/courses" className="text-sm font-semibold text-primary">
                More →
              </Link>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {recommended.slice(0, 3).map((course) => (
                <StudentCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-display text-3xl font-bold">{loading ? "—" : value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
