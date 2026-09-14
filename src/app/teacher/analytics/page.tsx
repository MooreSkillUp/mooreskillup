"use client";

import { useState } from "react";
import { BarChart3, Download, GraduationCap, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { downloadTeacherAnalyticsCsv, useTeacherAnalytics } from "@/lib/teacher-analytics";

/**
 * How a teacher's courses are actually doing.
 *
 * Deliberately about learners, not about course admin. It used to open with
 * eight cards, half of them counts of courses by status — the same thing the
 * dashboard pipeline shows, and zero for most teachers. Four figures remain,
 * each about people.
 */
export default function TeacherAnalyticsPage() {
  const { notifyError } = useFeedback();
  const { data, isLoading, error } = useTeacherAnalytics();
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    try {
      setExporting(true);
      await downloadTeacherAnalyticsCsv();
    } catch (exportError) {
      notifyError(
        "Export failed",
        exportError instanceof Error ? exportError.message : "Unable to export.",
      );
    } finally {
      setExporting(false);
    }
  };

  const totals = data?.totals;
  const trend = data?.enrollmentTrend ?? [];
  const hasEnrollments = (totals?.totalEnrollments ?? 0) > 0;

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Course performance</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Covers only the courses assigned to you.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => void onExport()}
            loading={exporting}
            loadingText="Exporting…"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Users}
            label="Total enrollments"
            value={totals?.totalEnrollments ?? 0}
            sub="One per student per course"
          />
          <MetricCard
            icon={BarChart3}
            label="Engaged learners"
            value={totals?.engagedLearners ?? 0}
            sub="People who opened a lesson"
          />
          <MetricCard
            icon={GraduationCap}
            label="Active learners"
            value={totals?.activeLearners ?? 0}
            sub="Studied in the last 30 days"
          />
          <MetricCard
            icon={TrendingUp}
            label="Completion rate"
            value={`${totals?.completionRate ?? 0}%`}
            sub="Enrollments finished"
          />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">New enrollments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Eight weekly totals. Bars rather than a curve — a line between two weeks would
            draw growth that never happened.
          </p>
          <div className="mt-5 h-60 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : hasEnrollments ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      fontSize: "0.8125rem",
                    }}
                  />
                  <Bar dataKey="enrollments" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {trend.map((week, index) => (
                      // The final bar is the week in progress, so it is drawn
                      // faded — it is not yet comparable with the ones beside it.
                      <Cell
                        key={week.label}
                        fill="var(--color-accent)"
                        fillOpacity={index === trend.length - 1 ? 0.45 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium">No enrollments yet</p>
                <p className="text-sm text-muted-foreground">
                  This chart fills in as students join your courses.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Per course</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            &quot;Engaged&quot; counts enrollments where at least one lesson has been opened. The
            headline figure above counts people instead, so a student taking three of your
            courses is one learner there and three rows here.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Course</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 text-right font-medium">Enrolled</th>
                  <th className="pb-3 pr-4 text-right font-medium">Engaged</th>
                  <th className="pb-3 pr-4 text-right font-medium">Active 30d</th>
                  <th className="pb-3 text-right font-medium">Completion</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && !data?.courses.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No courses yet. Create one to start seeing analytics.
                    </td>
                  </tr>
                )}
                {data?.courses.map((course) => (
                  <tr key={course.courseId} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-medium">{course.title || "Untitled course"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{course.status}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{course.enrollments}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{course.engaged}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{course.activeLearners}</td>
                    <td className="py-3 text-right tabular-nums">{course.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4 font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-sm font-medium">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
