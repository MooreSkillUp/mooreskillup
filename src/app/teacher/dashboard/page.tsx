"use client";

import Link from "next/link";
import { BookOpen, Settings, Upload, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { teacherUploads } from "@/lib/mock-data";

export default function TeacherDashboardPage() {
  const publishedCourses = teacherUploads.filter((item) => item.status === "Published").length;
  const totalUploads = teacherUploads.length;
  const learnerReach = teacherUploads.reduce((sum, item) => sum + item.learners, 0);

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Teacher panel
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Teach, track, and improve</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Your teacher workspace is focused on course ownership, upload structure, learner
              progress, and profile configuration for the tracks you teach.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/teacher/upload">
              <Button variant="accent">
                <Upload className="h-4 w-4" /> Upload course
              </Button>
            </Link>
            <Link href="/teacher/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4" /> Teacher settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: BookOpen, label: "Published courses", value: `${publishedCourses}` },
            { icon: Upload, label: "Total uploads", value: `${totalUploads}` },
            { icon: Users, label: "Learners reached", value: `${learnerReach}` },
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

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Your active uploads</h2>
            <div className="mt-6 space-y-4">
              {teacherUploads.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-display text-xl font-bold">{item.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.program} | {item.track} | {item.status}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.learners} learners | {item.completionRate}% completion | {item.modules.length} sections
                      </div>
                    </div>
                    <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium">
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Panel map</h2>
            <div className="mt-5 space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/40 p-4">
                `/teacher/dashboard` for published courses, total uploads, and learner reach.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                `/teacher/upload` for course setup, section access toggles, lessons, tasks, and preview.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                `/teacher/settings` for display profile, locked primary program, track, and bio.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
