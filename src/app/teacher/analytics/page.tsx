"use client";

import { useState } from "react";
import { BarChart3, BookOpen, Download, GraduationCap, TrendingUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import {
  downloadTeacherAnalyticsCsv,
  useTeacherAnalytics,
} from "@/lib/teacher-analytics";

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

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Analytics
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Your course performance</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              These numbers cover only the courses assigned to you — enrollments, active learners, and
              completion across your own courses.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <Button variant="outline" onClick={() => void onExport()} loading={exporting} loadingText="Exporting...">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={BookOpen} label="Your courses" value={totals?.totalCourses ?? 0} sub={`${totals?.publishedCourses ?? 0} published`} />
          <MetricCard icon={Users} label="Total enrollments" value={totals?.totalEnrollments ?? 0} />
          <MetricCard icon={GraduationCap} label="Active learners (30d)" value={totals?.activeLearners ?? 0} />
          <MetricCard icon={TrendingUp} label="Completion rate" value={`${totals?.completionRate ?? 0}%`} />
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Enrollment trend (last 8 weeks)
          </h2>
          <div className="mt-5 h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.enrollmentTrend ?? []}>
                  <defs>
                    <linearGradient id="enrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="var(--color-primary)"
                    fill="url(#enrollGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold">Per-course breakdown</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="pb-3 pr-4">Course</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Enrollments</th>
                  <th className="pb-3 pr-4">Active (30d)</th>
                  <th className="pb-3 pr-4">Completion</th>
                  <th className="pb-3">Views</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && !data?.courses.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No courses yet. Create a course to start seeing analytics.
                    </td>
                  </tr>
                )}
                {data?.courses.map((course) => (
                  <tr key={course.courseId} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{course.title || "Untitled course"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{course.status}</td>
                    <td className="py-3 pr-4">{course.enrollments}</td>
                    <td className="py-3 pr-4">{course.activeLearners}</td>
                    <td className="py-3 pr-4">{course.completionRate}%</td>
                    <td className="py-3">{course.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
