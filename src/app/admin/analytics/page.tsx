"use client";

import {
  Activity,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/dashboard/AppShell";
import { useAdminPlatform } from "@/lib/admin-platform";

export default function AdminAnalyticsPage() {
  const { analytics, totals, teachers, students, courses, isLoading, error } = useAdminPlatform();

  const engagement = analytics?.engagement ?? [];

  const averageCompletion = engagement.length
    ? Math.round(engagement.reduce((sum, item) => sum + item.completionRate, 0) / engagement.length)
    : 0;

  const averageEnrollments = engagement.length
    ? Math.round(engagement.reduce((sum, item) => sum + item.enrollments, 0) / engagement.length)
    : 0;

  const rankedEngagement = [...engagement].sort((a, b) => b.enrollments - a.enrollments);
  const topCourse = rankedEngagement[0] ?? null;
  const needsAttention = [...engagement]
    .filter((item) => item.enrollments > 0)
    .sort((a, b) => a.completionRate - b.completionRate)[0] ?? null;
  const studentCount = totals?.students ?? students.length;
  const payingStudents = totals?.payingStudents ?? 0;
  const conversionRate = studentCount ? Math.round((payingStudents / studentCount) * 100) : 0;

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Platform analytics
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Deep performance and growth insights</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Review student growth, teacher distribution, engagement performance, revenue trends, and enrollment behavior without crowding the main dashboard.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={Users} label="Students" value={`${totals?.students ?? students.length}`} />
          <MetricCard icon={ShieldCheck} label="Teachers" value={`${totals?.teachers ?? teachers.length}`} />
          <MetricCard icon={GraduationCap} label="Courses" value={`${totals?.courses ?? courses.length}`} />
          <MetricCard icon={TrendingUp} label="Weekly enrollments" value={`${analytics?.weeklyEnrollments ?? 0}`} />
          <MetricCard icon={Activity} label="Average completion" value={`${averageCompletion}%`} />
          <MetricCard icon={CreditCard} label="Monthly revenue" value={`NGN ${totals?.monthlyRevenue ?? "0.00"}`} />
        </div>

        {/* Insights strip */}
        <div className="grid gap-4 md:grid-cols-3">
          <Insight
            tone="positive"
            label="Top course by enrollment"
            primary={topCourse?.title ?? "—"}
            secondary={topCourse ? `${topCourse.enrollments} enrollments · ${topCourse.completionRate}% completion` : "No data yet"}
          />
          <Insight
            tone="warning"
            label="Needs attention"
            primary={needsAttention?.title ?? "All healthy"}
            secondary={
              needsAttention
                ? `${needsAttention.completionRate}% completion · ${needsAttention.enrollments} enrolled`
                : "No low-completion courses"
            }
          />
          <Insight
            tone="neutral"
            label="Paid conversion"
            primary={`${conversionRate}%`}
            secondary={`${payingStudents} of ${studentCount} students have paid`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel
            title="Student and teacher growth"
            description="Track registration trends across the last seven reporting periods."
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.registrations ?? []}>
                  <defs>
                    <linearGradient id="analyticsStudentsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="students" stroke="var(--color-primary)" fill="url(#analyticsStudentsFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="teachers" stroke="var(--color-accent)" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Revenue trend"
            description="Compare platform revenue across recent monthly periods."
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.revenue ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="var(--color-accent)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel
            title="Engagement analytics"
            description="Review completion and enrollment distribution across active courses."
          >
            <div className="space-y-3">
              {rankedEngagement.length ? (
                rankedEngagement.map((course) => (
                  <div key={course.courseId} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{course.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {course.enrollments} enrollments
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:w-48 shrink-0">
                        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(course.completionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-10 text-right">
                          {course.completionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  loading={isLoading}
                  message="No engagement data is available yet."
                />
              )}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel
              title="Teacher analytics"
              description="Quick view of current teacher footprint and course load."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Active teachers" value={`${teachers.filter((item) => item.status === "active").length}`} />
                <Stat label="Inactive teachers" value={`${teachers.filter((item) => item.status !== "active").length}`} />
                <Stat label="Published courses" value={`${courses.filter((item) => item.status === "published").length}`} />
                <Stat label="Courses in review" value={`${courses.filter((item) => item.status === "review").length}`} />
              </div>
            </Panel>

            <Panel
              title="Student performance summary"
              description="High-level learning health pulled from current platform data."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Active enrollments" value={`${totals?.activeEnrollments ?? 0}`} />
                <Stat label="Completed enrollments" value={`${totals?.completedEnrollments ?? 0}`} />
                <Stat label="Completion rate" value={`${totals?.courseCompletionRate ?? 0}%`} />
                <Stat label="Avg. enrollments / course" value={`${averageEnrollments}`} />
              </div>
            </Panel>

            <Panel
              title="Usage trends"
              description="Track the current shape of platform activity."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Active users today" value={`${totals?.activeUsersToday ?? 0}`} />
                <Stat label="Paying students" value={`${totals?.payingStudents ?? 0}`} />
                <Stat label="Monthly enrollments" value={`${analytics?.monthlyEnrollments ?? 0}`} />
                <Stat label="Total payments" value={`${totals?.payments ?? 0}`} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Insight({
  tone,
  label,
  primary,
  secondary,
}: {
  tone: "positive" | "warning" | "neutral";
  label: string;
  primary: string;
  secondary: string;
}) {
  const toneStyles = {
    positive: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900",
    warning: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-900",
    neutral: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${toneStyles[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold leading-tight">{primary}</div>
      <div className="mt-1 text-sm opacity-75">{secondary}</div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ loading, message }: { loading: boolean; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
      {loading ? "Loading analytics..." : message}
    </div>
  );
}
