"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Moon, Search, UserCheck, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { downloadTeacherStudentsCsv, useTeacherStudents } from "@/lib/teacher-analytics";
import { cn } from "@/lib/utils";

/** "3 days ago", "Today", "—". Exact timestamps are noise at this scale. */
function relativeDay(iso: string | null) {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "A month ago" : `${months} months ago`;
}

/**
 * Everyone in this teacher's courses, one row per enrolment.
 *
 * A student taking three courses is three rows, so every summary figure counts
 * rows except the student count itself — and each label says which, because the
 * page previously reported "Active (30d) 9" directly beneath "4 unique
 * students".
 */
export default function TeacherStudentsPage() {
  const { notifyError } = useFeedback();
  const { data, isLoading, error } = useTeacherStudents();
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const summary = data?.summary;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = data?.students ?? [];
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.courseTitle].some((value) => value.toLowerCase().includes(query)),
    );
  }, [data?.students, search]);

  const onExport = async () => {
    try {
      setExporting(true);
      await downloadTeacherStudentsCsv();
    } catch (exportError) {
      notifyError(
        "Export failed",
        exportError instanceof Error ? exportError.message : "Unable to export.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My students</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One row per enrollment. Active means a lesson was opened in the last 30 days.
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
            label="Enrollments"
            value={summary?.totalEnrollments ?? 0}
            sub={`${summary?.uniqueStudents ?? 0} ${summary?.uniqueStudents === 1 ? "student" : "students"}`}
          />
          <MetricCard
            icon={UserCheck}
            label="Active"
            value={summary?.activeEnrollments ?? 0}
            sub="Studied in the last 30 days"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completed"
            value={summary?.completedEnrollments ?? 0}
            sub="Finished the course"
          />
          <MetricCard
            icon={Moon}
            label="Dormant"
            value={summary?.dormantEnrollments ?? 0}
            sub="No lesson opened in 30 days"
          />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-lg font-semibold">Enrollments</h2>
            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or course"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Course</th>
                  <th className="pb-3 pr-4 font-medium">Enrolled</th>
                  {/* The column a teacher actually scans for: who has gone
                      quiet. The data was already computed and never shown. */}
                  <th className="pb-3 pr-4 font-medium">Last active</th>
                  <th className="pb-3 pr-4 font-medium">Progress</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && !filtered.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {data?.students.length
                        ? "No students match your search."
                        : "No students enrolled yet."}
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={`${row.studentId}-${row.courseId}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.courseTitle}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(row.enrolledAt).toLocaleDateString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-4",
                        row.lastActiveAt ? "text-muted-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {relativeDay(row.lastActiveAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.progressPercent >= 100 ? "bg-success" : "bg-accent",
                            )}
                            style={{ width: `${Math.min(100, row.progressPercent)}%` }}
                          />
                        </div>
                        <span className="w-9 text-xs tabular-nums text-muted-foreground">
                          {Math.round(row.progressPercent)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          row.status === "completed"
                            ? "bg-success/15 text-success"
                            : row.isActive
                              ? "bg-accent/15 text-accent"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {row.status === "completed"
                          ? "Completed"
                          : row.isActive
                            ? "Active"
                            : "Dormant"}
                      </span>
                    </td>
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
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-sm font-medium">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
