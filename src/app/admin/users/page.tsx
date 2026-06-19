"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
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
import { type Interest, type TrackName } from "@/lib/mock-data";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

export default function AdminUsersPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { interests, trackOptionsByInterest } = usePlatformTaxonomy();
  const {
    teachers,
    courses,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    reassignCourse,
    isLoading,
    error,
  } = useAdminPlatform();
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftProgram, setDraftProgram] = useState<Interest>("Web Development");
  const [draftTracks, setDraftTracks] = useState<TrackName[]>(["React and Modern UI"]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [createdTeacherMessage, setCreatedTeacherMessage] = useState("");
  const [actionState, setActionState] = useState<string | null>(null);
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [newTeacherForm, setNewTeacherForm] = useState({
    displayName: "",
    email: "",
    program: "Web Development" as Interest,
    tracks: ["React and Modern UI"] as TrackName[],
  });

  useEffect(() => {
    if (!interests.length) return;
    const nextProgram = interests.includes(newTeacherForm.program)
      ? newTeacherForm.program
      : interests[0];
    const nextTracks = trackOptionsByInterest[nextProgram] ?? [];
    const filteredTracks = newTeacherForm.tracks.filter((track) => nextTracks.includes(track));
    const normalizedTracks = filteredTracks.length ? filteredTracks : nextTracks[0] ? [nextTracks[0]] : [];

    if (
      nextProgram !== newTeacherForm.program ||
      normalizedTracks.length !== newTeacherForm.tracks.length ||
      normalizedTracks.some((track, index) => track !== newTeacherForm.tracks[index])
    ) {
      setNewTeacherForm((current) => ({
        ...current,
        program: nextProgram,
        tracks: normalizedTracks,
      }));
    }
  }, [interests, newTeacherForm.program, newTeacherForm.tracks, trackOptionsByInterest]);

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;
  const inactiveTeachers = teachers.filter((teacher) => teacher.status === "inactive").length;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const deleteTarget = teachers.find((teacher) => teacher.id === deleteTeacherId) ?? null;

  const teacherRows = useMemo(
    () =>
      teachers.map((teacher) => ({
        ...teacher,
        courseCount: courses.filter((course) => course.teacherId === teacher.id).length,
      })),
    [courses, teachers],
  );

  const startEdit = (teacherId: string) => {
    const teacher = teachers.find((item) => item.id === teacherId);
    if (!teacher) return;
    setEditingTeacherId(teacherId);
    setDraftName(teacher.displayName);
    setDraftEmail(teacher.email);
    setDraftProgram(teacher.academicProgram as Interest);
    setDraftTracks(
      (teacher.academicTracks.length ? teacher.academicTracks : [teacher.academicTrack]) as TrackName[],
    );
  };

  const saveEdit = async () => {
    if (!editingTeacherId) return;
    setActionState("save-teacher");
    try {
      await updateTeacher(editingTeacherId, {
        displayName: draftName.trim() || undefined,
        email: draftEmail.trim() || undefined,
        program: draftProgram,
        track: draftTracks[0],
        tracks: draftTracks,
      });
      setEditingTeacherId(null);
      notifySuccess("Teacher updated successfully");
    } catch (actionError) {
      notifyError("Unable to update teacher", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setActionState(null);
    }
  };

  const assignToExistingTeacher = async () => {
    if (!selectedCourseId || !selectedOwnerId) return;
    setActionState("reassign-existing");
    try {
      await reassignCourse({ courseId: selectedCourseId, newTeacherId: selectedOwnerId });
      notifySuccess("Course reassigned successfully");
    } catch (actionError) {
      notifyError("Unable to reassign course", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setActionState(null);
    }
  };

  const createTeacherAndAssign = async () => {
    if (!selectedCourseId || !newTeacherForm.displayName.trim() || !newTeacherForm.email.trim()) return;
    setActionState("create-assign");
    try {
      const nextTeacher = await createTeacher({
      displayName: newTeacherForm.displayName.trim(),
      email: newTeacherForm.email.trim(),
        program: newTeacherForm.program,
        track: newTeacherForm.tracks[0],
        tracks: newTeacherForm.tracks,
      });
      setCreatedTeacherMessage(
        nextTeacher.temporaryPassword
          ? `Teacher created: ${nextTeacher.email} | Temporary password: ${nextTeacher.temporaryPassword}`
          : `Teacher created: ${nextTeacher.email}`,
      );
      await reassignCourse({ courseId: selectedCourseId, newTeacherId: nextTeacher.id });
      setSelectedOwnerId(nextTeacher.id);
        setNewTeacherForm({
          displayName: "",
          email: "",
          program: "Web Development",
          tracks: ["React and Modern UI"],
        });
      notifySuccess("Teacher created and assigned", "The course ownership has been updated.");
    } catch (actionError) {
      notifyError("Unable to create and assign teacher", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setActionState(null);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Teacher management
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Manage teachers and safe ownership</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              This view focuses only on teachers so course ownership and reassignment remain clear and manageable.
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          <Link href="/admin/teachers">
            <Button variant="accent">
              <UserPlus className="h-4 w-4" /> Create new teacher
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Users, label: "Teachers", value: `${teachers.length}` },
            { icon: ShieldCheck, label: "Active teachers", value: `${activeTeachers}` },
            { icon: UserPlus, label: "Inactive teachers", value: `${inactiveTeachers}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="mt-5 font-display text-3xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="font-display text-2xl font-bold">Teacher table</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Edit teacher details, review course load, and safely move course ownership.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Tracks</th>
                    <th className="px-4 py-3">Courses uploaded</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherRows.map((teacher) => (
                    <tr key={teacher.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{teacher.displayName}</div>
                        <div className="text-xs text-muted-foreground">{teacher.email}</div>
                      </td>
                      <td className="px-4 py-3">{teacher.academicProgram}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.academicTracks.map((track) => (
                            <span
                              key={`${teacher.id}-${track}`}
                              className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                            >
                              {track}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{teacher.courseCount}</td>
                      <td className="px-4 py-3">
                        {teacher.status === "active" ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(teacher.id)}
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setActionState(`${teacher.id}:status`);
                              try {
                                await updateTeacher(teacher.id, {
                                  status: teacher.status === "active" ? "inactive" : "active",
                                });
                                notifySuccess(
                                  teacher.status === "active" ? "Teacher deactivated" : "Teacher activated",
                                );
                              } catch (actionError) {
                                notifyError(
                                  "Unable to update teacher",
                                  actionError instanceof Error ? actionError.message : "Request failed.",
                                );
                              } finally {
                                setActionState(null);
                              }
                            }}
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                          >
                            {actionState === `${teacher.id}:status`
                              ? "Updating..."
                              : teacher.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTeacherId(teacher.id);
                              setDeleteConfirmation("");
                            }}
                            className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-destructive"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCourseId(
                                courses.find((course) => course.teacherId === teacher.id)?.id ?? "",
                              )
                            }
                            className="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
                          >
                            Manage courses
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-2xl font-bold">Edit teacher details</div>
              {editingTeacherId ? (
                <div className="mt-5 space-y-4">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
                    placeholder="Teacher name"
                  />
                  <input
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
                    placeholder="Teacher email"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={draftProgram}
                      onChange={(event) => {
                        const nextProgram = event.target.value as Interest;
                        const nextTracks = trackOptionsByInterest[nextProgram] ?? [];
                        setDraftProgram(nextProgram);
                        setDraftTracks(nextTracks.length ? [nextTracks[0] as TrackName] : []);
                      }}
                      className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm"
                    >
                      {interests.map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-lg border border-input bg-background p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Assigned tracks
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(trackOptionsByInterest[draftProgram] ?? []).map((track) => {
                          const active = draftTracks.includes(track);
                          return (
                            <button
                              key={track}
                              type="button"
                              onClick={() =>
                                setDraftTracks((current) => {
                                  if (current.includes(track)) {
                                    const nextTracks = current.filter((item) => item !== track);
                                    return nextTracks.length ? nextTracks : current;
                                  }
                                  return [...current, track];
                                })
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card text-muted-foreground"
                              }`}
                            >
                              {track}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Default track: {draftTracks[0] ?? "None selected"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="accent" onClick={() => void saveEdit()} loading={actionState === "save-teacher"} loadingText="Saving...">
                      Save changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingTeacherId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Select a teacher row to edit name or email.
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-2xl font-bold">Course reassignment</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Courses are never lost. Move them to another teacher immediately or let admin ownership hold them safely.
              </p>

              <div className="mt-5 space-y-4">
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedOwnerId}
                  onChange={(event) => setSelectedOwnerId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                >
                  <option value="">Select existing teacher</option>
                  {teachers
                    .filter((teacher) => teacher.status === "active")
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.displayName} | {teacher.academicProgram} | {(teacher.academicTracks[0] ?? teacher.academicTrack)}
                      </option>
                    ))}
                </select>

                <div className="flex flex-wrap gap-3">
                  <Button variant="accent" onClick={() => void assignToExistingTeacher()} loading={actionState === "reassign-existing"} loadingText="Reassigning..." disabled={!selectedCourseId || !selectedOwnerId}>
                    Reassign to selected teacher
                  </Button>
                  <Button
                    variant="outline"
                    loading={actionState === "move-admin"}
                    loadingText="Moving..."
                    onClick={async () => {
                      if (!selectedCourseId) return;
                      setActionState("move-admin");
                      try {
                        await reassignCourse({ courseId: selectedCourseId, newTeacherId: "admin-owned" });
                        notifySuccess("Course moved to admin ownership");
                      } catch (actionError) {
                        notifyError("Unable to move course", actionError instanceof Error ? actionError.message : "Request failed.");
                      } finally {
                        setActionState(null);
                      }
                    }}
                    disabled={!selectedCourseId}
                  >
                    Move to admin ownership
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                <div className="font-medium">Create new teacher and assign immediately</div>
                <div className="mt-4 space-y-3">
                  <input
                    value={newTeacherForm.displayName}
                    onChange={(event) =>
                      setNewTeacherForm((current) => ({ ...current, displayName: event.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none"
                    placeholder="Teacher name"
                  />
                  <input
                    value={newTeacherForm.email}
                    onChange={(event) =>
                      setNewTeacherForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none"
                    placeholder="Teacher email"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={newTeacherForm.program}
                      onChange={(event) => {
                        const program = event.target.value as Interest;
                        setNewTeacherForm((current) => ({
                          ...current,
                          program,
                          tracks: trackOptionsByInterest[program]?.length
                            ? [trackOptionsByInterest[program][0]]
                            : [],
                        }));
                      }}
                      className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm"
                    >
                      {interests.map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-lg border border-input bg-card p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Assigned tracks
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(trackOptionsByInterest[newTeacherForm.program] ?? []).map((track) => {
                          const active = newTeacherForm.tracks.includes(track);
                          return (
                            <button
                              key={track}
                              type="button"
                              onClick={() =>
                                setNewTeacherForm((current) => {
                                  if (current.tracks.includes(track)) {
                                    const nextTracks = current.tracks.filter((item) => item !== track);
                                    return nextTracks.length ? { ...current, tracks: nextTracks } : current;
                                  }
                                  return { ...current, tracks: [...current.tracks, track] };
                                })
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground"
                              }`}
                            >
                              {track}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Default track: {newTeacherForm.tracks[0] ?? "None selected"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void createTeacherAndAssign()}
                    loading={actionState === "create-assign"}
                    loadingText="Creating + assigning..."
                    disabled={!selectedCourseId || !interests.length || isLoading}
                  >
                    Create teacher account + assign course
                  </Button>
                  {createdTeacherMessage && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-3 text-sm text-foreground">
                      {createdTeacherMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {selectedCourse
                  ? `Selected course: ${selectedCourse.title}. If you do nothing, admin ownership remains the fallback.`
                  : "Select a course above to start reassignment."}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => (!open ? setDeleteTeacherId(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete teacher account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type the teacher&apos;s full name exactly to confirm permanent deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Type <span className="font-semibold">{deleteTarget?.displayName}</span> to continue.
          </div>
          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
            placeholder={deleteTarget?.displayName}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeacherId(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              loading={actionState === "delete-teacher"}
              loadingText="Deleting teacher..."
              disabled={deleteConfirmation !== deleteTarget?.displayName}
              onClick={async () => {
                if (!deleteTarget) return;
                setActionState("delete-teacher");
                try {
                  await deleteTeacher(deleteTarget.id);
                  notifySuccess("Teacher deleted successfully");
                  setDeleteTeacherId(null);
                  setDeleteConfirmation("");
                  if (editingTeacherId === deleteTarget.id) {
                    setEditingTeacherId(null);
                  }
                } catch (actionError) {
                  notifyError(
                    "Unable to delete teacher",
                    actionError instanceof Error ? actionError.message : "Request failed.",
                  );
                } finally {
                  setActionState(null);
                }
              }}
            >
              Delete teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
