"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Mail,
  PencilLine,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { CredentialHandoff, type Handoff } from "@/components/admin/CredentialHandoff";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { hasUserPermission, type AdminResourceAction } from "@/lib/admin-rbac";
import { useAdminPlatform, type AdminTeacher } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { usePlatformTaxonomy } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

type Confirmation = { kind: "deactivate" | "resend" | "remove"; teacher: AdminTeacher };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default function AdminTeachersPage() {
  // useSearchParams needs a Suspense boundary during static rendering.
  return (
    <Suspense fallback={null}>
      <TeachersView />
    </Suspense>
  );
}

/**
 * One place to manage teachers.
 *
 * There used to be two — "Manage teachers" and "Create teacher" — which could
 * both create, deactivate and delete, and disagreed about what those did. One
 * said deleting "removes access"; it permanently deletes the account. One said
 * sign-in details "were emailed" every time; production had never sent an
 * email. Only one could edit a teacher or move their courses, only the other
 * could resend an invite. Everything real from both is here, described as the
 * backend actually behaves.
 */
function TeachersView() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const searchParams = useSearchParams();
  const can = (permission: string) =>
    hasUserPermission(user?.permissions, permission as AdminResourceAction);

  const {
    teachers,
    courses,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resendTeacherInvite,
    reassignCourse,
    systemAlerts,
    isLoading,
    error,
  } = useAdminPlatform();
  const { interests, trackOptionsByInterest, error: taxonomyError } = usePlatformTaxonomy();

  const [showCreate, setShowCreate] = useState(() => searchParams.get("new") === "1");
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [moving, setMoving] = useState<AdminTeacher | null>(null);

  const emailOff = systemAlerts.emailDelivers === false;

  const coursesByTeacher = useMemo(() => {
    const map = new Map<string, typeof courses>();
    for (const course of courses) {
      if (!course.teacherId || course.teacherId === "admin-owned") continue;
      map.set(course.teacherId, [...(map.get(course.teacherId) ?? []), course]);
    }
    return map;
  }, [courses]);

  const activeCount = teachers.filter((teacher) => teacher.status === "active").length;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teachers.filter((teacher) => {
      if (statusFilter !== "all" && teacher.status !== statusFilter) return false;
      if (!query) return true;
      return [teacher.displayName, teacher.email, teacher.academicProgram ?? "", ...(teacher.academicTracks ?? [])]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [teachers, search, statusFilter]);

  const run = async (key: string, action: () => Promise<void>, failure: string) => {
    setBusyId(key);
    try {
      await action();
    } catch (actionError) {
      notifyError(failure, actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onCreate = async (input: {
    displayName: string;
    email: string;
    password?: string;
    program: string;
    tracks: string[];
  }) => {
    const teacher = await createTeacher({ ...input, track: input.tracks[0] });
    setShowCreate(false);
    if (teacher.temporaryPassword) {
      setHandoff({
        email: teacher.email,
        password: teacher.temporaryPassword,
        context: `${teacher.displayName}'s account was created.`,
      });
      notifySuccess("Teacher added", "Pass on the sign-in details shown at the top of the page.");
    } else {
      notifySuccess("Teacher added", `Sign-in details were emailed to ${teacher.email}.`);
    }
  };

  const confirmAction = async () => {
    if (!confirmation) return;
    const { kind, teacher } = confirmation;
    await run(
      `${teacher.id}:${kind}`,
      async () => {
        if (kind === "deactivate") {
          await updateTeacher(teacher.id, { status: "inactive" });
          notifySuccess(`${teacher.displayName} deactivated`);
        } else if (kind === "resend") {
          const result = await resendTeacherInvite(teacher.id);
          if (result.temporaryPassword) {
            setHandoff({
              email: teacher.email,
              password: result.temporaryPassword,
              context: `A new password was set for ${teacher.displayName}. The old one no longer works.`,
            });
          }
          notifySuccess("New sign-in details", result.detail);
        } else {
          await deleteTeacher(teacher.id);
          notifySuccess(`${teacher.displayName} deleted`);
        }
        setConfirmation(null);
      },
      kind === "remove" ? "Could not delete teacher" : "Could not update teacher",
    );
  };

  // Without this permission the data is never fetched, so the page used to
  // render its empty state and report zeros that were not true.
  if (!hasUserPermission(user?.permissions, "teachers:view")) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to teachers" detail="Teacher records are available to Admins and Super Admins." />
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Teachers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : `${plural(teachers.length, "teacher")} · ${activeCount} active`}
            </p>
            {(error || taxonomyError) && (
              <p className="mt-2 text-sm text-destructive">{taxonomyError || error}</p>
            )}
          </div>
          {can("teachers:create") && (
            <Button variant="accent" className="shrink-0" onClick={() => setShowCreate((value) => !value)}>
              <UserPlus className="h-4 w-4" /> {showCreate ? "Close" : "Add teacher"}
            </Button>
          )}
        </header>

        {handoff && <CredentialHandoff handoff={handoff} onDone={() => setHandoff(null)} />}

        {emailOff && !handoff && (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <span className="font-medium">Email isn&apos;t being delivered.</span>{" "}
            <span className="text-muted-foreground">
              When you add a teacher or resend an invite, the password will be shown here for you to
              pass on — nothing reaches their inbox.
            </span>
          </p>
        )}

        {showCreate && can("teachers:create") && (
          <CreateTeacherPanel
            interests={interests}
            trackOptionsByInterest={trackOptionsByInterest}
            onCreate={onCreate}
            onError={(message) => notifyError("Could not add teacher", message)}
          />
        )}

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="teacher-search"
                aria-label="Search teachers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, program or track"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <select
              id="teacher-status"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {!isLoading && !visible.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {teachers.length ? "No teachers match." : "No teachers yet. Add the first one above."}
            </p>
          )}

          <ul className="divide-y divide-border">
            {visible.map((teacher) => {
              const owned = coursesByTeacher.get(teacher.id) ?? [];
              const tracks = teacher.academicTracks?.length ? teacher.academicTracks : teacher.tracks;
              const busy = busyId?.startsWith(teacher.id) ?? false;
              const active = teacher.status === "active";

              return (
                <li key={teacher.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{teacher.displayName}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {teacher.academicProgram || teacher.program}
                        {tracks?.length ? ` · ${tracks.join(", ")}` : ""}
                        {" · "}
                        {plural(owned.length, "course")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {can("teachers:edit") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setEditingId(editingId === teacher.id ? null : teacher.id)}
                        >
                          <PencilLine className="h-4 w-4" /> Edit
                        </Button>
                      )}
                      {can("teachers:edit") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setConfirmation({ kind: "resend", teacher })}
                        >
                          <Mail className="h-4 w-4" /> New sign-in details
                        </Button>
                      )}
                      {can("courses:reassign") && owned.length > 0 && (
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setMoving(teacher)}>
                          <ArrowRightLeft className="h-4 w-4" /> Move courses
                        </Button>
                      )}
                      {can("teachers:edit") &&
                        (active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setConfirmation({ kind: "deactivate", teacher })}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            loading={busyId === `${teacher.id}:reactivate`}
                            loadingText="Reactivating…"
                            onClick={() =>
                              void run(
                                `${teacher.id}:reactivate`,
                                async () => {
                                  await updateTeacher(teacher.id, { status: "active" });
                                  notifySuccess(`${teacher.displayName} reactivated`);
                                },
                                "Could not reactivate teacher",
                              )
                            }
                          >
                            Reactivate
                          </Button>
                        ))}
                      {can("teachers:delete") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmation({ kind: "remove", teacher })}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingId === teacher.id && (
                    <EditTeacherForm
                      teacher={teacher}
                      interests={interests}
                      trackOptionsByInterest={trackOptionsByInterest}
                      onCancel={() => setEditingId(null)}
                      onSave={async (patch) => {
                        await run(
                          `${teacher.id}:save`,
                          async () => {
                            await updateTeacher(teacher.id, patch);
                            setEditingId(null);
                            notifySuccess("Teacher updated");
                          },
                          "Could not update teacher",
                        );
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {confirmation && (
        <ConfirmDialog
          confirmation={confirmation}
          courseCount={(coursesByTeacher.get(confirmation.teacher.id) ?? []).length}
          emailOff={emailOff}
          busy={busyId === `${confirmation.teacher.id}:${confirmation.kind}`}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirmAction()}
        />
      )}

      {moving && (
        <MoveCoursesDialog
          teacher={moving}
          courses={coursesByTeacher.get(moving.id) ?? []}
          teachers={teachers.filter((teacher) => teacher.status === "active" && teacher.id !== moving.id)}
          onCancel={() => setMoving(null)}
          onMove={async (target) => {
            const owned = coursesByTeacher.get(moving.id) ?? [];
            await run(
              `${moving.id}:move`,
              async () => {
                for (const course of owned) {
                  await reassignCourse({ courseId: course.id, newTeacherId: target });
                }
                notifySuccess(`Moved ${plural(owned.length, "course")}`);
                setMoving(null);
              },
              "Could not move courses",
            );
          }}
        />
      )}
    </AppShell>
  );
}

function ProgramAndTracks({
  interests,
  trackOptionsByInterest,
  program,
  tracks,
  onChange,
}: {
  interests: readonly string[];
  trackOptionsByInterest: Record<string, readonly string[]>;
  program: string;
  tracks: string[];
  onChange: (next: { program: string; tracks: string[] }) => void;
}) {
  const options = trackOptionsByInterest[program] ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="teacher-program" className="text-sm font-medium">
          Program
        </label>
        <select
          id="teacher-program"
          value={program}
          onChange={(event) => {
            const next = event.target.value;
            const first = (trackOptionsByInterest[next] ?? [])[0];
            onChange({ program: next, tracks: first ? [first] : [] });
          }}
          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
        >
          {interests.map((interest) => (
            <option key={interest} value={interest}>
              {interest}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Tracks</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.length ? (
            options.map((track) => {
              const selected = tracks.includes(track);
              return (
                <button
                  key={track}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (selected) {
                      const remaining = tracks.filter((item) => item !== track);
                      // A teacher needs at least one track to build a course in.
                      if (remaining.length) onChange({ program, tracks: remaining });
                    } else {
                      onChange({ program, tracks: [...tracks, track] });
                    }
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {track}
                </button>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">This program has no tracks yet.</p>
          )}
        </div>
        {tracks[0] && (
          <p className="mt-2 text-xs text-muted-foreground">
            New courses default to <span className="font-medium">{tracks[0]}</span>.
          </p>
        )}
      </fieldset>
    </div>
  );
}

function CreateTeacherPanel({
  interests,
  trackOptionsByInterest,
  onCreate,
  onError,
}: {
  interests: readonly string[];
  trackOptionsByInterest: Record<string, readonly string[]>;
  onCreate: (input: { displayName: string; email: string; password?: string; program: string; tracks: string[] }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [classification, setClassification] = useState({ program: "", tracks: [] as string[] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (classification.program || !interests.length) return;
    const first = (trackOptionsByInterest[interests[0]] ?? [])[0];
    setClassification({ program: interests[0], tracks: first ? [first] : [] });
  }, [classification.program, interests, trackOptionsByInterest]);

  const mismatch = Boolean(password) && password !== confirmPassword;
  const ready = displayName.trim() && email.trim() && classification.tracks.length && !mismatch;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    try {
      await onCreate({
        displayName: displayName.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        program: classification.program,
        tracks: classification.tracks,
      });
    } catch (createError) {
      onError(createError instanceof Error ? createError.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Add a teacher</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        They sign in with a temporary password and are asked to choose their own straight away.
      </p>

      {!interests.length ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          There are no programs yet. Create one under Courses first — a teacher has to belong to one.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="new-teacher-name"
              label="Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Amina Yusuf"
              required
            />
            <Input
              id="new-teacher-email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="amina@example.com"
              required
            />
          </div>

          <ProgramAndTracks
            interests={interests}
            trackOptionsByInterest={trackOptionsByInterest}
            program={classification.program}
            tracks={classification.tracks}
            onChange={setClassification}
          />

          <details className="rounded-xl border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Set the temporary password yourself</summary>
            <p className="mt-1 text-xs text-muted-foreground">Leave blank and one is generated.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <PasswordInput
                id="new-teacher-password"
                label="Temporary password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                id="new-teacher-password-confirm"
                label="Confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {mismatch && <p className="mt-2 text-xs text-destructive">The passwords don&apos;t match.</p>}
          </details>

          <Button type="submit" variant="accent" disabled={!ready} loading={submitting} loadingText="Adding…">
            <UserPlus className="h-4 w-4" /> Add teacher
          </Button>
        </form>
      )}
    </section>
  );
}

function EditTeacherForm({
  teacher,
  interests,
  trackOptionsByInterest,
  onSave,
  onCancel,
}: {
  teacher: AdminTeacher;
  interests: readonly string[];
  trackOptionsByInterest: Record<string, readonly string[]>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(teacher.displayName);
  const [email, setEmail] = useState(teacher.email);
  const [classification, setClassification] = useState({
    program: teacher.academicProgram || teacher.program,
    tracks: teacher.academicTracks?.length ? [...teacher.academicTracks] : [...teacher.tracks],
  });
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mt-4 space-y-4 rounded-xl border border-border bg-background p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSave({
          displayName: displayName.trim(),
          email: email.trim(),
          program: classification.program,
          track: classification.tracks[0],
          tracks: classification.tracks,
        });
        setSaving(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={`edit-name-${teacher.id}`} label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        <Input id={`edit-email-${teacher.id}`} label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <ProgramAndTracks
        interests={interests}
        trackOptionsByInterest={trackOptionsByInterest}
        program={classification.program}
        tracks={classification.tracks}
        onChange={setClassification}
      />
      <p className="text-xs text-muted-foreground">
        Changing their tracks doesn&apos;t move courses they&apos;ve already built — those stay in their
        own track.
      </p>
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

function ConfirmDialog({
  confirmation,
  courseCount,
  emailOff,
  busy,
  onCancel,
  onConfirm,
}: {
  confirmation: Confirmation;
  courseCount: number;
  emailOff: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { kind, teacher } = confirmation;
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  // What each action does, as the backend does it.
  const copy = {
    deactivate: {
      title: `Deactivate ${teacher.displayName}?`,
      body: [
        "They won't be able to sign in.",
        courseCount
          ? `Their ${plural(courseCount, "course")} move to admin ownership now, and won't move back if you reactivate them — you'd reassign them by hand.`
          : "They have no courses to move.",
      ],
      action: "Deactivate",
      destructive: false,
    },
    resend: {
      title: `New sign-in details for ${teacher.displayName}?`,
      body: [
        "This sets a new temporary password. Their current password stops working immediately.",
        emailOff
          ? "Email isn't being delivered, so the new password will be shown to you to pass on."
          : `The new details are emailed to ${teacher.email}.`,
      ],
      action: "Set new password",
      destructive: false,
    },
    remove: {
      title: `Delete ${teacher.displayName}?`,
      body: [
        "This permanently deletes their account. It can't be undone.",
        courseCount
          ? `Their ${plural(courseCount, "course")} stay on the platform, under admin ownership.`
          : "They have no courses.",
      ],
      action: "Delete teacher",
      destructive: true,
    },
  }[kind];

  const blocked = kind === "remove" && typed.trim() !== teacher.displayName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-confirm-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="teacher-confirm-title" className="font-display text-lg font-bold">
          {copy.title}
        </h2>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          {copy.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {kind === "remove" && (
          <div className="mt-4">
            <label htmlFor="teacher-confirm-name" className="text-sm font-medium">
              Type <span className="font-semibold">{teacher.displayName}</span> to confirm
            </label>
            <input
              id="teacher-confirm-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="accent"
            className={copy.destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            disabled={blocked}
            loading={busy}
            loadingText="Working…"
            onClick={onConfirm}
          >
            {copy.action}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MoveCoursesDialog({
  teacher,
  courses,
  teachers,
  onCancel,
  onMove,
}: {
  teacher: AdminTeacher;
  courses: { id: string; title: string }[];
  teachers: AdminTeacher[];
  onCancel: () => void;
  onMove: (targetId: string) => Promise<void>;
}) {
  const [target, setTarget] = useState("admin-owned");
  const [moving, setMoving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !moving && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-courses-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="move-courses-title" className="font-display text-lg font-bold">
          Move {teacher.displayName}&apos;s courses
        </h2>
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
          {courses.map((course) => (
            <li key={course.id}>· {course.title || "Untitled course"}</li>
          ))}
        </ul>
        <label htmlFor="move-target" className="mt-4 block text-sm font-medium">
          Move to
        </label>
        <select
          id="move-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="admin-owned">Admin ownership</option>
          {teachers.map((other) => (
            <option key={other.id} value={other.id}>
              {other.displayName} · {other.academicProgram || other.program}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          Students keep their enrollments and progress. Only who can edit the course changes.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={moving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="accent"
            loading={moving}
            loadingText="Moving…"
            onClick={async () => {
              setMoving(true);
              await onMove(target);
              setMoving(false);
            }}
          >
            Move {plural(courses.length, "course")}
          </Button>
        </div>
      </div>
    </div>
  );
}
