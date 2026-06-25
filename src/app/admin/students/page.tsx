"use client";

import { useMemo, useState } from "react";
import { Download, GiftIcon, GraduationCap, PencilLine, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform } from "@/lib/admin-platform";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 10;

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const canDelete = hasUserPermission(user?.permissions, "students:delete");
  const { students, courses, updateStudent, deleteStudent, grantStudentAccess, isLoading, error } =
    useAdminPlatform();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPlan, setDraftPlan] = useState("free");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [grantCourseId, setGrantCourseId] = useState("");

  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === "published"),
    [courses],
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextStudents = students.filter((student) => {
      const matchesSearch =
        !query ||
        [student.displayName, student.email, student.selectedInterest, student.selectedTrack]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...nextStudents].sort((left, right) => {
      if (sortBy === "name") return left.displayName.localeCompare(right.displayName);
      if (sortBy === "enrollments") return right.enrolledCourses - left.enrolledCourses;
      if (sortBy === "payments") return right.totalPayments - left.totalPayments;
      const leftTime = left.lastActiveAt ? new Date(left.lastActiveAt).getTime() : 0;
      const rightTime = right.lastActiveAt ? new Date(right.lastActiveAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [search, sortBy, statusFilter, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const deleteTarget = students.find((student) => student.id === deleteTargetId) ?? null;

  const beginEdit = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    setSelectedStudentId(studentId);
    setDraftName(student.displayName);
    setDraftEmail(student.email);
    setDraftPlan(student.plan);
  };

  const activeCount = students.filter((student) => student.status === "active").length;
  const disabledCount = students.filter((student) => student.status === "disabled").length;

  const toggleSelect = (studentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = paginatedStudents.every((student) => next.has(student.id));
      paginatedStudents.forEach((student) => {
        if (allSelected) next.delete(student.id);
        else next.add(student.id);
      });
      return next;
    });
  };

  const bulkUpdateStatus = async (status: "active" | "disabled") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setActionKey("bulk-status");
    try {
      await Promise.all(ids.map((id) => updateStudent(id, { status })));
      notifySuccess(
        status === "disabled" ? "Selected students suspended" : "Selected students reactivated",
        `${ids.length} account${ids.length === 1 ? "" : "s"} updated.`,
      );
      setSelectedIds(new Set());
    } catch (actionError) {
      notifyError(
        "Bulk update failed",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setActionKey(null);
    }
  };

  const exportCsv = () => {
    const rows = filteredStudents.length ? filteredStudents : students;
    const header = ["Name", "Email", "Program", "Track", "Enrollments", "Completed", "Payments", "Status"];
    const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((student) =>
        [
          student.displayName,
          student.email,
          student.selectedInterest || "",
          student.selectedTrack || "",
          student.enrolledCourses,
          student.completedCourses,
          student.totalPayments,
          student.status,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess("CSV exported", `${rows.length} student${rows.length === 1 ? "" : "s"} exported.`);
  };

  const grantAccess = async () => {
    if (!selectedStudent || !grantCourseId) return;
    setActionKey("grant-access");
    try {
      const result = await grantStudentAccess(selectedStudent.id, grantCourseId);
      notifySuccess("Access granted", result.detail);
      setGrantCourseId("");
    } catch (actionError) {
      notifyError(
        "Unable to grant access",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setActionKey(null);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Student management
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Manage learners with scale in mind</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Search, filter, sort, and page through learner accounts so the workspace stays fast and usable even with thousands of students.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="flex w-full max-w-xl items-end gap-3">
            <div className="flex-1">
              <Input
                label="Search students"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, program, or track"
              />
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={!students.length}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">
              {selectedIds.size} student{selectedIds.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={actionKey === "bulk-status"}
                onClick={() => void bulkUpdateStatus("disabled")}
              >
                Suspend selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={actionKey === "bulk-status"}
                onClick={() => void bulkUpdateStatus("active")}
              >
                Reactivate selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Students" value={`${students.length}`} />
          <MetricCard label="Active" value={`${activeCount}`} />
          <MetricCard label="Disabled" value={`${disabledCount}`} />
          <MetricCard label="Enrolled courses" value={`${students.reduce((sum, student) => sum + student.enrolledCourses, 0)}`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="font-display text-2xl font-bold">Students table</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Review learner status, enrollment progress, and payment activity in grouped pages.
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="recent">Last active</option>
                    <option value="name">Name</option>
                    <option value="enrollments">Enrollments</option>
                    <option value="payments">Payments</option>
                  </select>
                  <div className="flex items-center rounded-lg border border-input bg-background px-3.5 text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={paginatedStudents.length > 0 && paginatedStudents.every((student) => selectedIds.has(student.id))}
                        onChange={toggleSelectPage}
                        className="h-4 w-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Enrollments</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length ? (
                    paginatedStudents.map((student) => (
                      <tr key={student.id} className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student.displayName}`}
                            checked={selectedIds.has(student.id)}
                            onChange={() => toggleSelect(student.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{student.displayName}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{student.selectedInterest || "Unassigned"}</div>
                          <div className="text-xs text-muted-foreground">{student.selectedTrack || "No track"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{student.enrolledCourses}</div>
                          <div className="text-xs text-muted-foreground">{student.completedCourses} completed</div>
                        </td>
                        <td className="px-4 py-3">{student.totalPayments}</td>
                        <td className="px-4 py-3">{student.status === "active" ? "Active" : "Disabled"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(student.id)}
                              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setActionKey(`${student.id}:status`);
                                try {
                                  await updateStudent(student.id, {
                                    status: student.status === "active" ? "disabled" : "active",
                                  });
                                  notifySuccess(
                                    student.status === "active" ? "Student suspended" : "Student reactivated",
                                  );
                                } catch (actionError) {
                                  notifyError(
                                    "Unable to update student",
                                    actionError instanceof Error ? actionError.message : "Request failed.",
                                  );
                                } finally {
                                  setActionKey(null);
                                }
                              }}
                              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                            >
                              {actionKey === `${student.id}:status`
                                ? "Updating..."
                                : student.status === "active"
                                  ? "Suspend"
                                  : "Reactivate"}
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetId(student.id);
                                  setDeleteConfirmation("");
                                }}
                                className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-destructive"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-muted-foreground">
                        {isLoading ? "Loading students..." : "No students matched your filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedStudents.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}-
                {Math.min(safePage * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
                  Previous
                </Button>
                <Button variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </div>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="font-display text-2xl font-bold">Student profile editor</div>
            {selectedStudent ? (
              <div className="mt-5 space-y-4">
                <Input label="Display name" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                <Input label="Email" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Plan</label>
                  <select
                    value={draftPlan}
                    onChange={(event) => setDraftPlan(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  <div>
                    Last active:{" "}
                    {selectedStudent.lastActiveAt
                      ? new Date(selectedStudent.lastActiveAt).toLocaleString("en-NG")
                      : "No recent activity"}
                  </div>
                  <div className="mt-2">
                    Tracks: {selectedStudent.selectedTracks.join(", ") || "No tracks set"}
                  </div>
                  <div className="mt-2">
                    Enrollments: {selectedStudent.enrolledCourses} | Completed: {selectedStudent.completedCourses}
                  </div>
                </div>

                <Button
                  variant="accent"
                  loading={actionKey === "save-student"}
                  loadingText="Saving student..."
                  onClick={async () => {
                    setActionKey("save-student");
                    try {
                      await updateStudent(selectedStudent.id, {
                        displayName: draftName,
                        email: draftEmail,
                        plan: draftPlan,
                      });
                      notifySuccess("Student updated successfully");
                    } catch (actionError) {
                      notifyError(
                        "Unable to update student",
                        actionError instanceof Error ? actionError.message : "Request failed.",
                      );
                    } finally {
                      setActionKey(null);
                    }
                  }}
                >
                  <PencilLine className="h-4 w-4" /> Save student changes
                </Button>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <GiftIcon className="h-4 w-4 text-primary" /> Grant free course access
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enroll this student in a published course at no cost. They&apos;ll be notified immediately.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={grantCourseId}
                      onChange={(event) => setGrantCourseId(event.target.value)}
                      className="h-11 flex-1 rounded-lg border border-input bg-card px-3.5 text-sm"
                    >
                      <option value="">Select a course…</option>
                      {publishedCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      disabled={!grantCourseId}
                      loading={actionKey === "grant-access"}
                      loadingText="Granting..."
                      onClick={() => void grantAccess()}
                    >
                      Grant access
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Select a student from the table to edit profile details or review account activity.
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => (!open ? setDeleteTargetId(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete student account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type the student's name exactly to confirm permanent deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Type <span className="font-semibold">{deleteTarget?.displayName}</span> to confirm deletion.
          </div>
          <Input
            label="Confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={deleteTarget?.displayName}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              loading={actionKey === "delete-student"}
              loadingText="Deleting student..."
              disabled={deleteConfirmation !== deleteTarget?.displayName}
              onClick={async () => {
                if (!deleteTarget) return;
                setActionKey("delete-student");
                try {
                  await deleteStudent(deleteTarget.id);
                  notifySuccess("Student deleted successfully");
                  setDeleteTargetId(null);
                  setDeleteConfirmation("");
                  if (selectedStudentId === deleteTarget.id) {
                    setSelectedStudentId(null);
                  }
                } catch (actionError) {
                  notifyError(
                    "Unable to delete student",
                    actionError instanceof Error ? actionError.message : "Request failed.",
                  );
                } finally {
                  setActionKey(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="mt-5 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
