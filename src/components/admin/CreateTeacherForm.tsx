"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAdminPlatform } from "@/lib/admin-platform";
import { type Interest, type TrackName } from "@/lib/mock-data";
import { publicEnv } from "@/lib/public-env";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

export function CreateTeacherForm({ compact = false }: { compact?: boolean }) {
  const { createTeacher } = useAdminPlatform();
  const { interests, trackOptionsByInterest, isLoading: isLoadingTaxonomy, error: taxonomyError } =
    usePlatformTaxonomy();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>("Web Development");
  const [selectedTracks, setSelectedTracks] = useState<TrackName[]>(["React and Modern UI"]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const teacherLoginUrl = `${publicEnv.appUrl.replace(/\/$/, "")}/login`;
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

  const setField =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const chooseInterest = (interest: Interest) => {
    setSelectedInterest(interest);
    setSelectedTracks(
      ((trackOptionsByInterest[interest] ?? [])[0]
        ? [(trackOptionsByInterest[interest] ?? [])[0]]
        : []) as TrackName[],
    );
  };

  const copyCredentials = async (message: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(message);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!interests.length || !trackOptions.length || !selectedTracks.length) {
      setError("Teacher creation is unavailable until an admin adds categories and tracks.");
      return;
    }
    if (form.password && form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const createdTeacher = await createTeacher({
        displayName: form.displayName,
        email: form.email,
        program: selectedInterest,
        track: selectedTracks[0],
        tracks: selectedTracks,
        password: form.password || undefined,
      });
      const credentialMessage = createdTeacher.temporaryPassword
        ? `Teacher login\nEmail: ${createdTeacher.email}\nTemporary password: ${createdTeacher.temporaryPassword}\nLogin URL: ${teacherLoginUrl}\nInstruction: Login and change password immediately.`
        : `Teacher login\nEmail: ${createdTeacher.email}\nLogin URL: ${teacherLoginUrl}\nInstruction: Login and change password immediately.`;
      setSuccess(credentialMessage);
      await copyCredentials(credentialMessage);
      setForm({
        displayName: "",
        email: "",
        password: "",
        confirm: "",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create teacher account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Teacher display name"
          value={form.displayName}
          onChange={setField("displayName")}
          placeholder="Amina Yusuf"
          required
        />
        <Input label="Email" type="email" value={form.email} onChange={setField("email")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Temporary password"
          type="password"
          value={form.password}
          onChange={setField("password")}
          placeholder="Leave blank to auto-generate"
        />
        <Input
          label="Confirm password"
          type="password"
          value={form.confirm}
          onChange={setField("confirm")}
          placeholder="Only if you set one"
        />
      </div>

      <div>
        <div className="text-sm font-medium text-foreground">Assigned category</div>
        {taxonomyError && <p className="mt-2 text-sm text-destructive">{taxonomyError}</p>}
        {!taxonomyError && !isLoadingTaxonomy && !interests.length && (
          <p className="mt-2 text-sm text-muted-foreground">
            Teacher creation opens after categories and tracks are configured by admin.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((interest) => {
            const active = interest === selectedInterest;
            return (
              <button
                key={interest}
                type="button"
                onClick={() => chooseInterest(interest)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowRight className="h-4 w-4 text-primary" />
          Choose the assigned tracks inside {selectedInterest}
        </div>
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
                    ? "Assigned to this teacher. The first selected track becomes the default upload context."
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm whitespace-pre-line">
          {success}
          <div className="mt-2 text-xs text-muted-foreground">
            Credentials copied for sharing with the teacher.
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size={compact ? "md" : "lg"}
        className="w-full"
        disabled={loading || isLoadingTaxonomy || !interests.length || !trackOptions.length || !selectedTracks.length}
      >
        <Upload className="h-4 w-4" />
        {loading ? "Creating teacher..." : "Create teacher account"}
      </Button>
    </form>
  );
}
