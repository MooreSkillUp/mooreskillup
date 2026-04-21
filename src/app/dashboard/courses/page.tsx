"use client";

import Link from "next/link";
import { Compass, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";
import { getLearnerDashboardCourses } from "@/lib/mock-data";

export default function DashboardCoursesPage() {
  const { user } = useAuth();
  const collections = getLearnerDashboardCourses(user?.interests ?? [], user?.plan ?? "free");

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Your courses
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold">Keep every learning path inside your dashboard</h1>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                This workspace shows the courses you are actively taking first, then suggests more
                programs to explore without taking you out of your learning environment.
              </p>
            </div>
            <Link href="/pricing">
              <Button variant="outline">Compare plans</Button>
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold">Courses you are currently working on</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {collections.current.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-bold">Explore more courses inside your path</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {collections.recommended.map((course) => (
              <CourseCard key={course.id} course={course} showProgress={false} />
            ))}
          </div>
        </section>

        {collections.locked.length > 0 && (
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Courses waiting for your plan</h2>
            </div>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Free learners can still browse locked tracks here, but access depends on release-day
              rules or a plan upgrade.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {collections.locked.slice(0, 4).map((course) => (
                <div key={course.id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="font-display text-xl font-bold">{course.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {course.track} · {course.level}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{course.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
