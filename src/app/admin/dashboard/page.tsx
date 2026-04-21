"use client";

import Link from "next/link";
import { BellRing, CreditCard, FolderKanban, Shield, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import {
  adminBroadcasts,
  getAdminCourseRows,
  getPlatformOverview,
  getRevenueSummary,
  getTeacherRows,
} from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const overview = getPlatformOverview();
  const revenue = getRevenueSummary();
  const teachers = getTeacherRows();
  const courses = getAdminCourseRows().slice(0, 4);

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Admin panel
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Platform control room</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Manage tutors, platform notifications, payment visibility, and course ownership from
              one Django-ready admin workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/admin-register">
              <Button variant="accent">
                <UserPlus className="h-4 w-4" /> Create admin account
              </Button>
            </Link>
            <Link href="/auth/teacher-register">
              <Button variant="outline">Create teacher account</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Users, label: "Total students", value: `${overview.totalStudents}` },
            { icon: Shield, label: "Total tutors", value: `${overview.totalTutors}` },
            { icon: UserPlus, label: "Total admins", value: `${overview.totalAdmins}` },
            { icon: FolderKanban, label: "Total courses", value: `${overview.totalCourses}` },
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

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Payments and revenue</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total revenue</div>
                <div className="mt-2 font-display text-3xl font-bold">${revenue.totalRevenue}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course purchases</div>
                <div className="mt-2 font-display text-3xl font-bold">{revenue.totalPurchases}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {revenue.byCourse.slice(0, 5).map((item) => (
                <div key={item.courseId} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{item.courseTitle}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Tutor: {item.tutorName} • ${item.price} per course
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{item.purchases} purchases</div>
                      <div className="font-semibold text-foreground">${item.revenue} revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Broadcast notifications</h2>
            </div>
            <div className="mt-5 space-y-4">
              <input
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
                placeholder="Notification title"
              />
              <input
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
                placeholder="Image URL or asset path"
              />
              <Textarea
                className="min-h-28 bg-background"
                placeholder="Write the description that should show on the target dashboard."
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-full border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground">
                  All Students
                </button>
                <button type="button" className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
                  Tutors
                </button>
              </div>
              <Button variant="accent">Send notification</Button>
            </div>
            <div className="mt-6 space-y-3">
              {adminBroadcasts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">
                    {item.target} • {item.sentAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Tutor roles table</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Teachers only. Student rows are intentionally excluded.
                </p>
              </div>
              <Link href="/admin/users" className="text-sm font-semibold text-primary">
                Open management
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{teacher.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Teacher • {teacher.program} • {teacher.track}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{teacher.numberOfCourses} courses</div>
                      <div>{teacher.isActive ? "Active" : "Disabled / reassigned"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Admin courses view</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Read-only course ownership, tutor name, and price visibility.
                </p>
              </div>
              <Link href="/admin/courses" className="text-sm font-semibold text-primary">
                View all courses
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="font-medium">{course.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Tutor: {course.tutorName} • ${course.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
