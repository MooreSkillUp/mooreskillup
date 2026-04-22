"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { interests, trackOptionsByInterest, type Interest, type TrackName } from "@/lib/mock-data";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function AdminUsersPage() {
  const {
    teachers,
    courses,
    createTeacher,
    updateTeacher,
    reassignCourse,
  } = useTeacherWorkspace();
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [newTeacherForm, setNewTeacherForm] = useState({
    displayName: "",
    email: "",
    program: "Web Development" as Interest,
    track: "React and Modern UI" as TrackName,
  });

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;
  const inactiveTeachers = teachers.filter((teacher) => teacher.status === "inactive").length;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

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
  };

  const saveEdit = () => {
    if (!editingTeacherId) return;
    updateTeacher(editingTeacherId, {
      displayName: draftName.trim() || undefined,
      email: draftEmail.trim() || undefined,
    });
    setEditingTeacherId(null);
  };

  const assignToExistingTeacher = () => {
    if (!selectedCourseId || !selectedOwnerId) return;
    reassignCourse({ courseId: selectedCourseId, newTeacherId: selectedOwnerId });
  };

  const createTeacherAndAssign = () => {
    if (!selectedCourseId || !newTeacherForm.displayName.trim() || !newTeacherForm.email.trim()) return;
    const nextTeacher = createTeacher({
      displayName: newTeacherForm.displayName.trim(),
      email: newTeacherForm.email.trim(),
      program: newTeacherForm.program,
      track: newTeacherForm.track,
    });
    reassignCourse({ courseId: selectedCourseId, newTeacherId: nextTeacher.id });
    setSelectedOwnerId(nextTeacher.id);
    setNewTeacherForm({
      displayName: "",
      email: "",
      program: "Web Development",
      track: "React and Modern UI",
    });
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
          </div>
          <Button variant="accent" onClick={() => setEditingTeacherId("new")}>
            <UserPlus className="h-4 w-4" /> Prepare new teacher
          </Button>
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
                    <th className="px-4 py-3">Track</th>
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
                      <td className="px-4 py-3">{teacher.academicTrack}</td>
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
                            onClick={() =>
                              updateTeacher(teacher.id, {
                                status: teacher.status === "active" ? "inactive" : "active",
                              })
                            }
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                          >
                            {teacher.status === "active" ? "Deactivate" : "Activate"}
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
                  <div className="flex gap-3">
                    <Button variant="accent" onClick={saveEdit}>
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
                        {teacher.displayName} | {teacher.academicProgram} | {teacher.academicTrack}
                      </option>
                    ))}
                </select>

                <div className="flex flex-wrap gap-3">
                  <Button variant="accent" onClick={assignToExistingTeacher} disabled={!selectedCourseId || !selectedOwnerId}>
                    Reassign to selected teacher
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selectedCourseId) return;
                      reassignCourse({ courseId: selectedCourseId, newTeacherId: "admin-owned" });
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
                          track: trackOptionsByInterest[program][0],
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
                    <select
                      value={newTeacherForm.track}
                      onChange={(event) =>
                        setNewTeacherForm((current) => ({
                          ...current,
                          track: event.target.value as TrackName,
                        }))
                      }
                      className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm"
                    >
                      {trackOptionsByInterest[newTeacherForm.program].map((track) => (
                        <option key={track} value={track}>
                          {track}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" onClick={createTeacherAndAssign} disabled={!selectedCourseId}>
                    Create teacher account + assign course
                  </Button>
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
    </AppShell>
  );
}
