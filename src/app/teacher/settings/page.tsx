"use client";

import { useEffect, useState } from "react";
import { Check, Save, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform } from "@/lib/teacher-platform";
import { AVATARS, getAvatarById } from "@/lib/avatars";
import { useAuth } from "@/lib/auth";

// Show the first 5 avatars as selectable options for teachers.
const TEACHER_AVATARS = AVATARS.slice(0, 5);

export default function TeacherSettingsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { user } = useAuth();
  const { profile, updateProfile, error } = useTeacherPlatform();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(user?.avatarUrl ?? "av-blue");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  useEffect(() => {
    if (user?.avatarUrl) setSelectedAvatarId(user.avatarUrl);
  }, [user?.avatarUrl]);

  const currentAvatar = getAvatarById(selectedAvatarId) ?? TEACHER_AVATARS[0];

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName, avatarUrl: selectedAvatarId } as Parameters<typeof updateProfile>[0]);
      notifySuccess("Settings saved", "Your profile has been updated.");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unable to save settings.";
      notifyError("Unable to save settings", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page header */}
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Settings</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Profile &amp; settings</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Personalise your teacher profile. Email, program, and assigned tracks are managed by your admin and cannot
            be changed here.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        {/* Avatar picker */}
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Profile avatar</div>
          <div className="mt-4 flex items-center gap-6">
            {/* Current avatar preview */}
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl shadow-inner ${currentAvatar.gradient}`}
              aria-label={currentAvatar.label}
            >
              {currentAvatar.emoji}
            </div>
            <div>
              <div className="font-display text-xl font-bold">{currentAvatar.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">Choose from the avatars below.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {TEACHER_AVATARS.map((avatar) => {
              const active = selectedAvatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${avatar.gradient} ${
                    active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-90"
                  }`}
                  aria-label={avatar.label}
                  title={avatar.label}
                >
                  {avatar.emoji}
                  {active && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Profile fields */}
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Identity</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Input label="Email" value={profile.email} readOnly />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Program" value={profile.program} readOnly />
            <Input label="Default track" value={profile.track} readOnly />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background p-4">
            <div className="text-sm font-medium text-foreground">Assigned tracks</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.tracks.length ? profile.tracks : profile.track ? [profile.track] : []).map((track) => (
                <span
                  key={track}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                >
                  {track}
                </span>
              ))}
              {!profile.tracks.length && !profile.track && (
                <span className="text-sm text-muted-foreground">No tracks assigned yet.</span>
              )}
            </div>
          </div>

          <div className="mt-5">
            <Button variant="accent" onClick={saveSettings} loading={saving} loadingText="Saving...">
              <Save className="h-4 w-4" /> Save settings
            </Button>
          </div>
        </section>

        {/* Account security info */}
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Account &amp; security
          </div>
          <div className="mt-4 flex gap-4 rounded-2xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-700 dark:bg-amber-500/10">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100">Password reset policy</div>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Teacher accounts cannot use the public &quot;Forgot password&quot; flow. If you need to reset your
                password, contact your admin and ask them to resend your credentials. You will receive a new temporary
                password by email and will be prompted to change it on your next login.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
