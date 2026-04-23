"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { Button } from "../../components/ui-kit/Button";
import { Input } from "../../components/ui-kit/Input";
import { toDisplayName, useAuth } from "../../lib/auth";
import { trackOptionsByInterest } from "../../lib/mock-data";
import { useTeacherWorkspace } from "../../lib/teacher-workspace";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { categories } = useTeacherWorkspace();
  const academicPath = user?.selectedInterest ?? "Backend Development";
  const [username, setUsername] = useState(user?.username ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const availableTracks = useMemo(() => {
    const categoryTracks = categories
      .filter((category) => category.name === academicPath || category.program === academicPath)
      .flatMap((category) => category.subcategories.map((subcategory) => subcategory.name));

    const fallbackTracks =
      trackOptionsByInterest[academicPath as keyof typeof trackOptionsByInterest] ?? [];

    return Array.from(new Set(categoryTracks.length ? categoryTracks : fallbackTracks));
  }, [academicPath, categories]);

  const [selectedTracks, setSelectedTracks] = useState<string[]>(
    user?.selectedTracks?.length
      ? user.selectedTracks
      : user?.selectedTrack
        ? [user.selectedTrack]
        : availableTracks.slice(0, 1),
  );

  const toggleTrack = (track: string) => {
    setSelectedTracks((current) =>
      current.includes(track) ? current.filter((item) => item !== track) : [...current, track],
    );
  };

  const onProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const nextTracks = selectedTracks.length ? selectedTracks : availableTracks.slice(0, 1);
    try {
      await updateUser({
        username,
        displayName: toDisplayName(username),
        email: user?.email,
        interests: [academicPath],
        selectedInterest: academicPath,
        selectedTrack: nextTracks[0] ?? user?.selectedTrack,
        selectedTracks: nextTracks,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your profile.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Keep only the essentials: your username, fixed academic path, and the tracks you want prioritized.
          </p>
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Student profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email and academic path stay locked after registration. You can still refine the tracks inside your path.
          </p>

          <form onSubmit={onProfile} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <Input label="Email" type="email" value={user?.email ?? ""} readOnly />
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="text-sm font-medium text-foreground">Academic path</div>
              <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3">
                <div className="font-display text-lg font-bold">{academicPath}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Assigned at registration and read-only from here.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Selected tracks
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Choose multiple tracks under your academic path so course exploration and recommendations stay relevant.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableTracks.map((track) => {
                  const active = selectedTracks.includes(track);
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => toggleTrack(track)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {active ? "Included in your learning flow." : "Tap to add this track."}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              Course pricing and access stay synchronized automatically. Free courses open fully, while paid courses unlock after one successful payment.
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" variant="accent">
                <Save className="h-4 w-4" /> Save changes
              </Button>
              {saved && <span className="text-sm text-success">Saved.</span>}
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
