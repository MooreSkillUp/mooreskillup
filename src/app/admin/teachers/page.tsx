"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Mail, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform, type AdminTeacher } from "@/lib/admin-platform";
import { type Interest, type TrackName } from "@/lib/mock-data";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

export default function AdminTeachersPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { createTeacher, updateTeacher, deleteTeacher, resendTeacherInvite, teachers, isLoading, error } =
    useAdminPlatform();
  const { interests, trackOptionsByInterest, isLoading: isLoadingTaxonomy, error: taxonomyError } =
    usePlatformTaxonomy();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>("Web Development");
  const [selectedTracks, setSelectedTracks] = useState<TrackName[]>(["React and Modern UI"]);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [busyTeacherId, setBusyTeacherId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTeacher | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const trackOptions = useMemo(
    () => trackOptionsByInterest[selectedInterest] ?? [],
    [selectedInterest, trackOptionsByInterest],
  );

  useEffect(() => {
    if (!interests.length) return;

    if (!interests.includes(selectedInterest)) {
      const nextInterest = interests[0];
      setSelectedInterest(nextInterest);
      setSelectedTracks(
        ((trackOptionsByInterest[nextInterest] ?? [])[0]
          ? [(trackOptionsByInterest[nextInterest] ?? [])[0]]
          : ["React and Modern UI"]) as TrackName[],
      );
      return;
    }

    if (!trackOptions.length) {
      setSelectedTracks([]);
      return;
    }
    setSelectedTracks((current) => {
      const filtered = current.filter((track) => trackOptions.includes(track));
      if (filtered.length) return filtered;
      return [trackOptions[0]];
    });
  }, [interests, selectedInterest, trackOptions, trackOptionsByInterest]);

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teachers.filter((teacher) => {
      if (statusFilter !== "all" && teacher.status !== statusFilter) return false;
      if (!query) return true;
      return (
        teacher.displayName.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query) ||
        (teacher.academicTracks ?? []).some((track) => track.toLowerCase().includes(query)) ||
        (teacher.academicProgram ?? "").toLowerCase().includes(query)
      );
    });
  }, [teachers, search, statusFilter]);

  const resetForm = () => {
    setForm({ displayName: "", email: "", password: "", confirmPassword: "" });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!interests.length || !trackOptions.length || !selectedTracks.length) {
      notifyError(
        "Teacher setup unavailable",
        "Create at least one category and subcategory first so teacher specialization can be assigned.",
      );
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      notifyError("Password mismatch", "The password and confirm password fields must match.");
      return;
    }

    try {
      setSubmitting(true);
      const teacher = await createTeacher({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        program: selectedInterest,
        track: selectedTracks[0],
        tracks: selectedTracks,
        password: form.password.trim() || undefined,
      });
      resetForm();
      notifySuccess(
        "Teacher account created",
        `Sign-in details were emailed to ${teacher.email}.`,
      );
    } catch (actionError) {
      notifyError(
        "Unable to create teacher account",
        actionError instanceof Error ? actionError.message : "Unable to create teacher account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async (teacher: AdminTeacher) => {
    try {
      setBusyTeacherId(teacher.id);
      const result = await resendTeacherInvite(teacher.id);
      notifySuccess("Invite resent", result.detail);
    } catch (actionError) {
      notifyError(
        "Unable to resend invite",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyTeacherId(null);
    }
  };

  const toggleStatus = async (teacher: AdminTeacher) => {
    const nextStatus = teacher.status === "active" ? "inactive" : "active";
    try {
      setBusyTeacherId(teacher.id);
      await updateTeacher(teacher.id, { status: nextStatus });
      notifySuccess(
        nextStatus === "inactive"
          ? `${teacher.displayName} deactivated`
          : `${teacher.displayName} reactivated`,
        nextStatus === "inactive"
          ? "Their courses are unassigned but kept on the platform."
          : undefined,
      );
    } catch (actionError) {
      notifyError(
        "Unable to update teacher",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyTeacherId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== deleteTarget.displayName) {
      notifyError("Name does not match", "Type the teacher's exact name to confirm removal.");
      return;
    }
    try {
      setDeleting(true);
      await deleteTeacher(deleteTarget.id);
      notifySuccess(`${deleteTarget.displayName} removed`);
      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch (actionError) {
      notifyError(
        "Unable to remove teacher",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Teacher onboarding
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Create &amp; manage teachers</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Admin creates the teacher and assigns their category and track. Sign-in details are emailed
              to the teacher automatically — no manual handoff needed.
            </p>
            {(error || taxonomyError) && (
              <p className="mt-3 text-sm text-destructive">{taxonomyError || error}</p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teachers</div>
              <div className="mt-2 font-display text-3xl font-bold">{teachers.length}</div>
            </div>
            <div className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active now</div>
              <div className="mt-2 font-display text-3xl font-bold">{activeTeachers}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">New teacher form</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              The selected category and track here feed the same live taxonomy students see during
              registration and the same structure teachers use when uploading courses.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Teacher display name"
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Amina Yusuf"
                  required
                />
                <Input
                  label="Teacher email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="teacher@moreskillup.com"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PasswordInput
                  label="Temporary password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Leave blank to auto-generate"
                />
                <PasswordInput
                  label="Confirm password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  placeholder="Only if you set one"
                />
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="text-sm font-medium text-foreground">Assigned category</div>
                {!taxonomyError && !isLoadingTaxonomy && !interests.length && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No categories are available yet. Create them first in admin courses.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {interests.map((interest) => {
                    const active = interest === selectedInterest;
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          setSelectedInterest(interest);
                          setSelectedTracks(
                            ((trackOptionsByInterest[interest] ?? [])[0]
                              ? [(trackOptionsByInterest[interest] ?? [])[0]]
                              : []) as TrackName[],
                          );
                        }}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="text-sm font-medium text-foreground">Assigned tracks</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {trackOptions.map((track) => {
                    const active = selectedTracks.includes(track);
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() =>
                          setSelectedTracks((current) => {
                            if (current.includes(track)) {
                              const nextTracks = current.filter((item) => item !== track);
                              return nextTracks.length ? nextTracks : current;
                            }
                            return [...current, track];
                          })
                        }
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-accent bg-accent/10 shadow-sm"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <div className="font-display text-lg font-bold">{track}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {active
                            ? "Assigned to this teacher. The first selected track becomes the default course context."
                            : "Click to assign this track to the teacher."}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Default track for course creation: {selectedTracks[0] ?? "None selected"}
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={
                  isLoading || isLoadingTaxonomy || !form.displayName.trim() || !form.email.trim() || !interests.length || !trackOptions.length
                  || !selectedTracks.length
                }
                loading={submitting}
                loadingText="Creating teacher..."
              >
                <ShieldCheck className="h-4 w-4" />
                Create teacher account
              </Button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Manage teachers</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Search, resend sign-in details, deactivate, or remove a teacher. Removing a teacher requires
              typing their name to confirm.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, or track"
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Loading teachers...
                </div>
              )}
              {!isLoading && !filteredTeachers.length && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  {teachers.length ? "No teachers match your filters." : "No teachers created yet."}
                </div>
              )}
              {filteredTeachers.map((teacher) => {
                const busy = busyTeacherId === teacher.id;
                const tracks = teacher.academicTracks?.length ? teacher.academicTracks : teacher.tracks;
                return (
                  <div key={teacher.id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-lg font-bold">{teacher.displayName}</div>
                        <div className="text-sm text-muted-foreground">{teacher.email}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {teacher.academicProgram || teacher.program}
                          {tracks?.length ? ` · ${tracks.join(", ")}` : ""}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          teacher.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {teacher.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void resend(teacher)}
                      >
                        <Mail className="h-4 w-4" /> Resend invite
                      </Button>
                      <Button
                        variant={teacher.status === "active" ? "outline" : "accent"}
                        size="sm"
                        disabled={busy}
                        onClick={() => void toggleStatus(teacher)}
                      >
                        {teacher.status === "active" ? "Deactivate" : "Reactivate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeleteTarget(teacher);
                          setDeleteConfirm("");
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <h3 className="font-display text-xl font-bold">Remove {deleteTarget.displayName}?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This removes the teacher&apos;s access to MooreSkillUp. Their courses stay on the platform.
              To confirm, type their full name{" "}
              <span className="font-semibold text-foreground">{deleteTarget.displayName}</span> below.
            </p>
            <Input
              className="mt-4"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteTarget.displayName}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirm("");
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleteConfirm.trim() !== deleteTarget.displayName}
                loading={deleting}
                loadingText="Removing..."
                onClick={() => void confirmDelete()}
              >
                Remove teacher
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
