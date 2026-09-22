"use client";

import { useMemo, useState } from "react";
import { Download, GiftIcon, PencilLine, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { hasUserPermission, type AdminResourceAction } from "@/lib/admin-rbac";
import { useAdminPlatform, type AdminStudent } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function ago(iso?: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
}

type SortKey = "studied" | "name" | "enrolled" | "paid";
type Expanded = { id: string; mode: "edit" | "grant" } | null;

/**
 * Every student, with what they're doing and what an admin can do about it.
 *
 * Rebuilt from a seven-column table squeezed beside an editor panel — it clipped
 * its own actions off the right edge, and its filter dropdowns read "All st"
 * and "Last .". Two controls were removed rather than restyled: a Plan editor
 * that saved a value nothing on the platform reads, and nothing else.
 */
export default function AdminStudentsPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const can = (permission: string) =>
    hasUserPermission(user?.permissions, permission as AdminResourceAction);
  const { students, courses, updateStudent, deleteStudent, grantStudentAccess, isLoading, error } =
    useAdminPlatform();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [sortBy, setSortBy] = useState<SortKey>("studied");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminStudent | null>(null);
  // Suspending cuts a paying student off from everything they bought, and it
  // sat one click away from Delete with nothing in between. Reactivating is
  // harmless, so only suspension asks.
  const [suspendTarget, setSuspendTarget] = useState<AdminStudent | null>(null);

  const canEdit = can("students:edit");
  // Bulk suspension is its own permission in the matrix (super admin only);
  // the old page offered it to anyone who could edit a single student.
  const canBulk = can("students:bulk-suspend");

  const liveCourses = useMemo(() => courses.filter((course) => course.status === "published"), [courses]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = students.filter((student) => {
      if (statusFilter !== "all" && student.status !== statusFilter) return false;
      if (!query) return true;
      return [student.displayName, student.email, student.selectedInterest, student.selectedTrack]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
    const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
    return rows.sort((a, b) => {
      if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
      if (sortBy === "enrolled") return b.enrolledCourses - a.enrolledCourses;
      if (sortBy === "paid") return b.totalPayments - a.totalPayments;
      return time(b.lastActiveAt) - time(a.lastActiveAt);
    });
  }, [search, sortBy, statusFilter, students]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const activeCount = students.filter((student) => student.status === "active").length;

  const run = async (key: string, action: () => Promise<void>, failure: string) => {
    setBusy(key);
    try {
      await action();
    } catch (actionError) {
      notifyError(failure, actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (student: AdminStudent, next: "active" | "disabled") =>
    run(
      `${student.id}:status`,
      async () => {
        await updateStudent(student.id, { status: next });
        notifySuccess(next === "disabled" ? `${student.displayName} suspended` : `${student.displayName} reactivated`);
      },
      "Could not update student",
    );

  const bulkStatus = (next: "active" | "disabled") =>
    run(
      "bulk",
      async () => {
        const ids = Array.from(selected);
        await Promise.all(ids.map((id) => updateStudent(id, { status: next })));
        notifySuccess(
          next === "disabled" ? "Suspended" : "Reactivated",
          `${plural(ids.length, "account")} updated.`,
        );
        setSelected(new Set());
      },
      "Bulk update failed",
    );

  const exportCsv = () => {
    const rows = filtered.length ? filtered : students;
    const cell = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      [
        "Name",
        "Email",
        "WhatsApp",
        "Founding #",
        "Heard about us",
        "Detail",
        "Referred by",
        "Ambassador",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "Terms version",
        "Terms accepted",
        "Program",
        "Track",
        "Enrolled",
        "Completed",
        "Paid courses",
        "Last studied",
        "Last signed in",
        "Status",
      ]
        .map(cell)
        .join(","),
      ...rows.map((student) =>
        [
          student.displayName,
          student.email,
          student.whatsappNumber || "",
          student.foundingMemberNumber ?? "",
          student.heardAboutUs || "",
          student.heardAboutUsDetail || "",
          student.referredByUsername || "",
          student.ambassadorName || "",
          student.utmSource || "",
          student.utmMedium || "",
          student.utmCampaign || "",
          student.termsVersion || "",
          student.termsAcceptedAt ?? "",
          student.selectedInterest || "",
          student.selectedTrack || "",
          student.enrolledCourses,
          student.completedCourses,
          student.totalPayments,
          student.lastActiveAt ?? "",
          student.lastSignedInAt ?? "",
          student.status === "active" ? "Active" : "Suspended",
        ]
          .map(cell)
          .join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess("CSV exported", `${plural(rows.length, "student")}.`);
  };

  const pageIds = visible.map((student) => student.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  // Without this permission the data is never fetched, so the page used to
  // render its empty state and report zeros that were not true.
  if (!hasUserPermission(user?.permissions, "students:view")) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to students" detail="Student records are available to Admins and Super Admins." />
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : `${plural(students.length, "student")} · ${activeCount} active · ${students.length - activeCount} suspended`}
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          <Button variant="outline" className="shrink-0" onClick={exportCsv} disabled={!students.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </header>

        {canBulk && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="mr-auto text-sm font-medium">{plural(selected.size, "student")} selected</p>
            <Button variant="outline" size="sm" loading={busy === "bulk"} loadingText="Working…" onClick={() => void bulkStatus("disabled")}>
              Suspend
            </Button>
            <Button variant="outline" size="sm" disabled={busy === "bulk"} onClick={() => void bulkStatus("active")}>
              Reactivate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            {canBulk && (
              <input
                type="checkbox"
                aria-label="Select everyone on this page"
                checked={allOnPageSelected}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    pageIds.forEach((id) => (allOnPageSelected ? next.delete(id) : next.add(id)));
                    return next;
                  })
                }
                className="h-4 w-4 rounded border-border"
              />
            )}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="student-search"
                aria-label="Search students"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, program or track"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <select
              id="student-status"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Suspended</option>
            </select>
            <select
              id="student-sort"
              aria-label="Sort by"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="studied">Most recently studied</option>
              <option value="name">Name</option>
              <option value="enrolled">Most enrolled</option>
              <option value="paid">Most paid courses</option>
            </select>
          </div>

          {!isLoading && !visible.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {students.length ? "No students match." : "No students have signed up yet."}
            </p>
          )}

          <ul className="divide-y divide-border">
            {visible.map((student) => {
              const active = student.status === "active";
              const rowBusy = busy?.startsWith(student.id) ?? false;
              const studied = ago(student.lastActiveAt);
              const signedIn = ago(student.lastSignedInAt);
              return (
                <li key={student.id} className="flex gap-3 p-4 sm:p-5">
                  {canBulk && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${student.displayName}`}
                      checked={selected.has(student.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(student.id)) next.delete(student.id);
                          else next.add(student.id);
                          return next;
                        })
                      }
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{student.displayName}</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {active ? "Active" : "Suspended"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {student.selectedInterest || "No program chosen"}
                          {student.selectedTrack ? ` · ${student.selectedTrack}` : ""}
                        </p>
                      </div>
                      <dl className="flex gap-5 text-right">
                        {[
                          ["Enrolled", student.enrolledCourses],
                          ["Completed", student.completedCourses],
                          ["Paid", student.totalPayments],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dd className="font-display text-lg font-bold tabular-nums">{value}</dd>
                            <dt className="text-[11px] text-muted-foreground">{label}</dt>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {studied ? `Last studied ${studied}` : "Hasn't opened a lesson"}
                      {" · "}
                      {signedIn ? `signed in ${signedIn}` : "no sign-in recorded yet"}
                    </p>

                    {canEdit && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() =>
                            setExpanded(expanded?.id === student.id && expanded.mode === "grant" ? null : { id: student.id, mode: "grant" })
                          }
                        >
                          <GiftIcon className="h-4 w-4" /> Give a course
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() =>
                            setExpanded(expanded?.id === student.id && expanded.mode === "edit" ? null : { id: student.id, mode: "edit" })
                          }
                        >
                          <PencilLine className="h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={busy === `${student.id}:status`}
                          loadingText="Working…"
                          disabled={rowBusy}
                          onClick={() =>
                            active ? setSuspendTarget(student) : void setStatus(student, "active")
                          }
                        >
                          {active ? "Suspend" : "Reactivate"}
                        </Button>
                        {can("students:delete") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rowBusy}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(student)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        )}
                      </div>
                    )}

                    {expanded?.id === student.id && expanded.mode === "edit" && (
                      <EditStudentForm
                        student={student}
                        onCancel={() => setExpanded(null)}
                        onSave={(patch) =>
                          run(
                            `${student.id}:save`,
                            async () => {
                              await updateStudent(student.id, patch);
                              setExpanded(null);
                              notifySuccess("Student updated");
                            },
                            "Could not update student",
                          )
                        }
                      />
                    )}

                    {expanded?.id === student.id && expanded.mode === "grant" && (
                      <GrantCourseForm
                        student={student}
                        courses={liveCourses}
                        onCancel={() => setExpanded(null)}
                        onGrant={(courseId) =>
                          run(
                            `${student.id}:grant`,
                            async () => {
                              const result = await grantStudentAccess(student.id, courseId);
                              setExpanded(null);
                              notifySuccess("Access given", result.detail);
                            },
                            "Could not give access",
                          )
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {suspendTarget && (
        <SuspendStudentDialog
          student={suspendTarget}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={async () => {
            await setStatus(suspendTarget, "disabled");
            setSuspendTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteStudentDialog
          student={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDelete={async () => {
            await deleteStudent(deleteTarget.id);
            notifySuccess(`${deleteTarget.displayName} deleted`);
            setDeleteTarget(null);
          }}
          onSuspendInstead={async () => {
            await updateStudent(deleteTarget.id, { status: "disabled" });
            notifySuccess(`${deleteTarget.displayName} suspended`, "Their records are kept.");
            setDeleteTarget(null);
          }}
        />
      )}
    </AppShell>
  );
}

function EditStudentForm({
  student,
  onSave,
  onCancel,
}: {
  student: AdminStudent;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(student.displayName);
  const [email, setEmail] = useState(student.email);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mt-3 space-y-3 rounded-xl border border-border bg-background p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSave({ displayName: displayName.trim(), email: email.trim() });
        setSaving(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id={`student-name-${student.id}`} label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        <Input id={`student-email-${student.id}`} label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="accent" size="sm" loading={saving} loadingText="Saving…">
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function GrantCourseForm({
  student,
  courses,
  onGrant,
  onCancel,
}: {
  student: AdminStudent;
  courses: { id: string; title: string }[];
  onGrant: (courseId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [granting, setGranting] = useState(false);

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-4">
      <label htmlFor={`grant-${student.id}`} className="text-sm font-medium">
        Give {student.displayName} a course for free
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        They&apos;re enrolled straight away and get a notification. No payment is recorded.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          id={`grant-${student.id}`}
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="">Choose a live course…</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <Button
          variant="accent"
          size="sm"
          disabled={!courseId}
          loading={granting}
          loadingText="Giving…"
          onClick={async () => {
            setGranting(true);
            await onGrant(courseId);
            setGranting(false);
          }}
        >
          Give course
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SuspendStudentDialog({
  student,
  onConfirm,
  onCancel,
}: {
  student: AdminStudent;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [working, setWorking] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !working && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-student-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="suspend-student-title" className="font-display text-lg font-bold">
          Suspend {student.displayName}?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          They will be signed out and locked out of every course they are enrolled in, including
          any they paid for. Their progress and certificates are kept, and you can reactivate them
          at any time.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={working} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="accent"
            loading={working}
            loadingText="Suspending…"
            autoFocus
            onClick={() => {
              setWorking(true);
              void onConfirm().finally(() => setWorking(false));
            }}
          >
            Suspend
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteStudentDialog({
  student,
  onDelete,
  onSuspendInstead,
  onCancel,
}: {
  student: AdminStudent;
  onDelete: () => Promise<void>;
  onSuspendInstead: () => Promise<void>;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState<"delete" | "suspend" | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const attempt = async (kind: "delete" | "suspend") => {
    setWorking(kind);
    try {
      if (kind === "delete") await onDelete();
      else await onSuspendInstead();
    } catch (failure) {
      // The server refuses to delete a student with payments or certificates,
      // and says why. Show that here, beside the alternative, not in a toast.
      setRefusal(failure instanceof Error ? failure.message : "Request failed.");
      setWorking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !working && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-student-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-student-title" className="font-display text-lg font-bold">
          Delete {student.displayName}?
        </h2>

        {refusal ? (
          <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">{refusal}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently deletes their account, with their enrollments, lesson progress and
              reviews. It can&apos;t be undone. Students with payments or certificates can&apos;t be
              deleted — suspend them instead.
            </p>
            <label htmlFor="delete-student-name" className="mt-4 block text-sm font-medium">
              Type <span className="font-semibold">{student.displayName}</span> to confirm
            </label>
            <input
              id="delete-student-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={Boolean(working)} onClick={onCancel}>
            Cancel
          </Button>
          {student.status === "active" && (
            <Button
              variant={refusal ? "accent" : "outline"}
              loading={working === "suspend"}
              loadingText="Suspending…"
              disabled={Boolean(working)}
              onClick={() => void attempt("suspend")}
            >
              Suspend instead
            </Button>
          )}
          {!refusal && (
            <Button
              variant="accent"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={typed.trim() !== student.displayName || Boolean(working)}
              loading={working === "delete"}
              loadingText="Deleting…"
              onClick={() => void attempt("delete")}
            >
              Delete student
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
