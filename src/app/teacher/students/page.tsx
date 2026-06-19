"use client";

import { useMemo, useState } from "react";
import { Download, Search, UserCheck, UserMinus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { downloadTeacherStudentsCsv, useTeacherStudents } from "@/lib/teacher-analytics";

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
      notifyError("Export failed", exportError instanceof Error ? exportError.message : "Unable to export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Students</div>
            <h1 className="mt-2 font-display text-4xl font-bold">Students in your courses</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Everyone enrolled in the courses assigned to you, with their progress. Active means they
              opened a lesson in the last 30 days.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <Button variant="outline" onClick={() => void onExport()} loading={exporting} loadingText="Exporting...">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Total enrolled" value={summary?.totalEnrolled ?? 0} sub={`${summary?.uniqueStudents ?? 0} unique students`} />
          <MetricCard icon={UserCheck} label="Active (30d)" value={summary?.activeStudents ?? 0} />
          <MetricCard icon={UserCheck} label="Completed" value={summary?.completedStudents ?? 0} />
          <MetricCard icon={UserMinus} label="Inactive" value={summary?.inactiveStudents ?? 0} />
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-2xl font-bold">Enrolled students</h2>
            <div className="relative w-full max-w-xs">
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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Course</th>
                  <th className="pb-3 pr-4">Enrolled</th>
                  <th className="pb-3 pr-4">Progress</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && !filtered.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {data?.students.length ? "No students match your search." : "No students enrolled yet."}
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr key={`${row.studentId}-${row.courseId}`} className="border-b border-border/60">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.courseTitle}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(row.enrolledAt).toLocaleDateString("en-NG")}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, row.progressPercent)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(row.progressPercent)}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.status === "completed"
                            ? "bg-success/10 text-success"
                            : row.isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.status === "completed" ? "Completed" : row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
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
  icon: typeof Users;
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
