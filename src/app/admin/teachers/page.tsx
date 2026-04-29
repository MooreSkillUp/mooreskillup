"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAdminPlatform } from "@/lib/admin-platform";
import { type Interest, type TrackName } from "@/lib/mock-data";
import { publicEnv } from "@/lib/public-env";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

export default function AdminTeachersPage() {
  const { createTeacher, teachers, isLoading, error } = useAdminPlatform();
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
  const [submitError, setSubmitError] = useState("");
  const [createdTeacher, setCreatedTeacher] = useState<{
    email: string;
    displayName: string;
    temporaryPassword: string | null;
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

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
  const teacherLoginUrl = `${publicEnv.appUrl.replace(/\/$/, "")}/login`;

  const resetForm = () => {
    setForm({
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const copyCredentials = async () => {
    if (!createdTeacher) return;

    const lines = [
      `Teacher Name: ${createdTeacher.displayName}`,
      `Teacher Email: ${createdTeacher.email}`,
      createdTeacher.temporaryPassword ? `Temporary Password: ${createdTeacher.temporaryPassword}` : null,
      `Login URL: ${teacherLoginUrl}`,
      "Next Step: Teacher should log in and change the password immediately.",
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("Teacher credentials copied.");
    } catch {
      setCopyStatus("Unable to copy automatically. Please copy the credentials manually.");
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setCopyStatus("");

    if (!interests.length || !trackOptions.length || !selectedTracks.length) {
      setSubmitError("Create at least one category and subcategory first so teacher specialization can be assigned.");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setSubmitError("The password and confirm password fields must match.");
      return;
    }

    try {
      const teacher = await createTeacher({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        program: selectedInterest,
        track: selectedTracks[0],
        tracks: selectedTracks,
        password: form.password.trim() || undefined,
      });

      setCreatedTeacher({
        email: teacher.email,
        displayName: teacher.displayName,
        temporaryPassword: teacher.temporaryPassword ?? null,
      });
      resetForm();
    } catch (actionError) {
      setSubmitError(actionError instanceof Error ? actionError.message : "Unable to create teacher account.");
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
            <h1 className="mt-2 font-display text-4xl font-bold">Create teacher accounts inside admin</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Admin creates the teacher, assigns the teacher&apos;s category and track, then copies the temporary credentials for first login.
            </p>
            {(error || taxonomyError || submitError) && (
              <p className="mt-3 text-sm text-destructive">{submitError || taxonomyError || error}</p>
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
              The selected category and track here feed the same live taxonomy students see during registration and the same structure teachers use when uploading courses.
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
                <Input
                  label="Temporary password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Leave blank to auto-generate"
                />
                <Input
                  label="Confirm password"
                  type="password"
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
              >
                <ShieldCheck className="h-4 w-4" />
                {isLoading ? "Creating teacher..." : "Create teacher account"}
              </Button>
            </form>
          </section>

          <section className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Credential handoff</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                After creation, copy the teacher email and temporary password, send it to the teacher, and have the teacher log in from the normal login page.
              </p>

              {createdTeacher ? (
                <div className="mt-5 space-y-4 rounded-3xl border border-border bg-background p-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teacher name</div>
                    <div className="mt-1 font-medium">{createdTeacher.displayName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teacher email</div>
                    <div className="mt-1 font-medium">{createdTeacher.email}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Temporary password</div>
                    <div className="mt-1 font-medium">
                      {createdTeacher.temporaryPassword ?? "A custom password was set during creation."}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teacher login</div>
                    <div className="mt-1 font-medium">{teacherLoginUrl}</div>
                  </div>
                  <Button variant="outline" onClick={() => void copyCredentials()}>
                    <Copy className="h-4 w-4" />
                    Copy teacher credentials
                  </Button>
                  {copyStatus && <p className="text-sm text-success">{copyStatus}</p>}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                  No teacher has been created in this session yet.
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">First login flow</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  Admin creates the teacher account from this page.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Admin copies the credentials and sends them to the teacher.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Teacher logs in through the normal login page and can immediately access the teacher dashboard.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Password reset remains available from the shared forgot-password flow whenever the teacher needs it.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
