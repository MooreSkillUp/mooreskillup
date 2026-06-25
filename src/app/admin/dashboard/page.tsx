"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FolderCheck,
  FolderKanban,
  LifeBuoy,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { hasUserPermission, type AdminResourceAction } from "@/lib/admin-rbac";
import { useAdminPlatform } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";

type RangeKey = "7" | "30" | "90" | "all";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const {
    teachers,
    courses,
    supportTickets,
    totals,
    activityFeed,
    systemAlerts,
    isLoading,
    error,
  } = useAdminPlatform();
  const [range, setRange] = useState<RangeKey>("30");

  const hasPerm = (permission: string) =>
    hasUserPermission(user?.permissions, permission as AdminResourceAction);

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;
  const reviewCourses = courses.filter((course) => course.status === "review");
  const deletionRequests = courses.filter((course) => course.pendingDeletion);
  const openSupportTickets = supportTickets.filter((ticket) => ticket.status === "open");
  const failedPayments = systemAlerts.failedPayments ?? 0;

  const rangedActivity = useMemo(() => {
    if (range === "all") return activityFeed;
    const cutoff = Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    return activityFeed.filter((event) => new Date(event.timestamp).getTime() >= cutoff);
  }, [activityFeed, range]);

  const statCards = [
    { icon: Users, label: "Students", value: `${totals?.students ?? 0}`, href: "/admin/students", permission: "students:view" },
    { icon: Shield, label: "Active teachers", value: `${activeTeachers}`, href: "/admin/users", permission: "teachers:view" },
    { icon: FolderKanban, label: "Total courses", value: `${courses.length}`, href: "/admin/courses", permission: "courses:view" },
    { icon: FolderCheck, label: "Review queue", value: `${reviewCourses.length}`, href: "/admin/reviews", permission: "courses:approve" },
    { icon: CreditCard, label: "Active enrollments", value: `${totals?.activeEnrollments ?? 0}`, href: "/admin/payments", permission: "payments:view" },
    { icon: CreditCard, label: "Revenue", value: `NGN ${totals?.revenue ?? "0.00"}`, href: "/admin/payments", permission: "payments:view" },
  ].filter((card) => hasPerm(card.permission));

  const attention = [
    {
      key: "reviews",
      icon: FolderCheck,
      label: "Courses awaiting review",
      count: reviewCourses.length,
      href: "/admin/reviews",
      cta: "Open review queue",
      permission: "courses:approve",
    },
    {
      key: "deletions",
      icon: Trash2,
      label: "Course deletion requests",
      count: deletionRequests.length,
      href: "/admin/courses",
      cta: "Review requests",
      permission: "courses:delete",
    },
    {
      key: "tickets",
      icon: LifeBuoy,
      label: "Open support tickets",
      count: openSupportTickets.length,
      href: "/admin/support",
      cta: "Open support",
      permission: "support:view",
    },
    {
      key: "payments",
      icon: AlertTriangle,
      label: "Failed payments",
      count: failedPayments,
      href: "/admin/payments",
      cta: "Open payments",
      permission: "payments:view",
    },
  ].filter((item) => item.count > 0 && hasPerm(item.permission));

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
              A quick overview of what needs your attention and shortcuts into every admin area.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            {hasPerm("teachers:create") && (
              <Link href="/admin/teachers">
                <Button variant="accent">
                  <UserPlus className="h-4 w-4" /> Create teacher
                </Button>
              </Link>
            )}
            {hasPerm("notifications:broadcast") && (
              <Link href="/admin/broadcast-notifications">
                <Button variant="outline">Send a broadcast</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Clickable stat cards */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          {statCards.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="mt-5 font-display text-3xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground group-hover:text-primary">{item.label} →</div>
            </Link>
          ))}
        </div>

        {/* Needs attention */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-bold">Needs attention</h2>
          </div>
          <div className="mt-5 space-y-3">
            {attention.length ? (
              attention.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.count} item{item.count === 1 ? "" : "s"} waiting
                      </div>
                    </div>
                  </div>
                  <Link href={item.href}>
                    <Button variant="outline" size="sm">
                      {item.cta}
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                {isLoading ? "Loading platform status..." : "All clear — nothing needs your attention right now."}
              </div>
            )}
          </div>
        </section>

        {/* Shortcuts with mini-stats */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Admin shortcuts
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">Jump to where the work is</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/admin/reviews", label: "Review queue", stat: reviewCourses.length, permission: "courses:approve" },
              { href: "/admin/support", label: "Open tickets", stat: openSupportTickets.length, permission: "support:view" },
              { href: "/admin/courses", label: "Deletion requests", stat: deletionRequests.length, permission: "courses:view" },
              { href: "/admin/users", label: "Active teachers", stat: activeTeachers, permission: "teachers:view" },
            ].filter((shortcut) => hasPerm(shortcut.permission)).map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                <span>{shortcut.label}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{shortcut.stat}</span>
              </Link>
            ))}
          </div>
        </section>


        {/* Trimmed activity feed with date-range filter */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Recent activity</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as RangeKey)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Link href="/admin/activity-logs" className="text-sm font-semibold text-primary">
                View all →
              </Link>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {rangedActivity.length ? (
              rangedActivity.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="font-medium">{event.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{event.message}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">
                    {new Date(event.timestamp).toLocaleString("en-NG")}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                {isLoading ? "Loading activity feed..." : "No activity in this range."}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
