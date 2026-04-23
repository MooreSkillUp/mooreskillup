"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellRing,
  CreditCard,
  FolderKanban,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import { useAdminPlatform } from "@/lib/admin-platform";

type BroadcastAudience = "students" | "teachers";

export default function AdminDashboardPage() {
  const { teachers, courses, broadcasts, createBroadcast, clearBroadcastHistory, totals, isLoading, error } =
    useAdminPlatform();
  const [audience, setAudience] = useState<BroadcastAudience>("students");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState("");

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;
  const publishedCourses = courses.filter((course) => course.status === "published").length;

  const topTeachers = useMemo(
    () =>
      teachers
        .map((teacher) => ({
          ...teacher,
          courseCount: courses.filter((course) => course.teacherId === teacher.id).length,
        }))
        .sort((left, right) => right.courseCount - left.courseCount)
        .slice(0, 4),
    [courses, teachers],
  );

  const sendBroadcast = () => {
    if (!title.trim() || !description.trim()) return;
    void createBroadcast({ title: title.trim(), description: description.trim(), audience }).then(() => {
      setSuccess(
        audience === "students"
          ? "Notification sent to all students"
          : "Notification sent to all teachers",
      );
      setTitle("");
      setDescription("");
    });
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Admin panel
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Platform control room</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Broadcast updates, monitor teacher activity, manage ownership fallback, and keep platform data synchronized from one admin workspace.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/teachers">
              <Button variant="accent">
                <UserPlus className="h-4 w-4" /> Create teacher account
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline">Manage teachers</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Users, label: "Students", value: `${totals?.students ?? 0}` },
            { icon: Shield, label: "Active teachers", value: `${activeTeachers}` },
            { icon: FolderKanban, label: "Total courses", value: `${courses.length}` },
            { icon: CreditCard, label: "Payments", value: `${totals?.payments ?? 0}` },
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
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Broadcast notifications</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Broadcasts stay synchronized with the same notification system teachers and admins see in the header. Broadcast history auto-expires after 24 hours.
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
                placeholder="Notification title"
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 bg-background"
                placeholder="Notification description"
              />
              <div>
                <div className="text-sm font-medium text-foreground">Target audience</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["students", "teachers"] as const).map((option) => {
                    const active = audience === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAudience(option)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {option === "students" ? "Students" : "Teachers"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="accent" onClick={sendBroadcast}>
                  Send notification
                </Button>
                {success && <div className="text-sm font-medium text-success">{success}</div>}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                  Notification history
                </div>
                <Button
                  variant="outline"
                  onClick={() => void clearBroadcastHistory()}
                  disabled={!broadcasts.length}
                >
                  Clear Notification History
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {broadcasts.length ? (
                  broadcasts.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                        </div>
                        <div className="text-sm text-muted-foreground md:text-right">
                          <div>Audience: {item.audience === "students" ? "Students" : item.audience === "teachers" ? "Teachers" : "All"}</div>
                          <div>Date sent: {item.sentAt ? new Date(item.sentAt).toLocaleString("en-NG") : "Pending"}</div>
                          <div className="font-medium text-foreground">Status: {item.status}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    {isLoading ? "Loading broadcasts..." : "No broadcasts in the active 24-hour window."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Teacher continuity</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Published courses
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">{publishedCourses}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Admin fallback ready
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">Safe</div>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  Removing a teacher never deletes a course.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Courses can move to admin ownership immediately or be reassigned to another teacher.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Ownership changes reflect instantly on teacher dashboards and course management screens.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold">Teacher snapshot</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current teaching roster and course load.
                  </p>
                </div>
                <Link href="/admin/users" className="text-sm font-semibold text-primary">
                  Open teacher management
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {topTeachers.map((teacher) => (
                  <div key={teacher.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{teacher.displayName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {teacher.academicProgram} | {teacher.academicTrack} | {teacher.courseCount} courses
                    </div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      {teacher.status === "active" ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
