"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, ShieldAlert, UserRound } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform } from "@/lib/teacher-platform";
import { AVATARS, getAvatarById } from "@/lib/avatars";
import { useAuth } from "@/lib/auth";

const TEACHER_AVATARS = AVATARS.slice(0, 8);

export default function TeacherSettingsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const { user, logoutAll } = useAuth();
  const { profile, updateProfile, error } = useTeacherPlatform();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(user?.avatarUrl ?? "av-blue");
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState({ displayName: profile.displayName, avatarId: user?.avatarUrl ?? "av-blue" });
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setSavedSnapshot((current) => ({ ...current, displayName: profile.displayName }));
  }, [profile.displayName]);

  useEffect(() => {
    if (user?.avatarUrl) {
      setSelectedAvatarId(user.avatarUrl);
      setSavedSnapshot((current) => ({ ...current, avatarId: user.avatarUrl ?? current.avatarId }));
    }
  }, [user?.avatarUrl]);

  const currentAvatar = getAvatarById(selectedAvatarId) ?? TEACHER_AVATARS[0];
  const hasChanges =
    displayName.trim() !== savedSnapshot.displayName.trim() || selectedAvatarId !== savedSnapshot.avatarId;

  const saveSettings = async () => {
    if (!displayName.trim()) {
      notifyError("Display name required", "Enter how you want your name to appear.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim(), avatarUrl: selectedAvatarId });
      setSavedSnapshot({ displayName: displayName.trim(), avatarId: selectedAvatarId });
      notifySuccess("Settings saved", "Your profile and header avatar have been updated.");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unable to save settings.";
      notifyError("Unable to save settings", message);
    } finally {
      setSaving(false);
    }
  };

  const onLogoutAll = async () => {
    setLogoutAllBusy(true);
    try {
      await logoutAll();
      notifySuccess("Signed out everywhere", "You have been logged out of all devices.");
      router.push("/auth/login?signed_out=all");
    } catch (error) {
      notifyError("Could not sign out everywhere", error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLogoutAllBusy(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Settings</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Your teacher profile</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Update how you appear across the workspace. Your avatar updates in the header immediately after saving.
            Program and tracks are assigned by your admin.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">Profile avatar</div>
              <p className="text-sm text-muted-foreground">Shown in the header, sidebar, and across your workspace.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5 rounded-2xl border border-border bg-background p-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-inner ${currentAvatar.gradient}`}
              aria-label={currentAvatar.label}
            >
              {currentAvatar.emoji}
            </div>
            <div>
              <div className="font-medium">{currentAvatar.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasChanges ? "Unsaved changes — click Save profile to apply." : "Currently active in your header."}
              </p>
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
                  className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${avatar.gradient} ${
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
            <Button
              variant="accent"
              onClick={() => void saveSettings()}
              loading={saving}
              loadingText="Saving..."
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4" /> Save profile
            </Button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Account security
          </div>
          <div className="mt-4 flex gap-4 rounded-2xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-700 dark:bg-amber-500/10">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100">Password reset policy</div>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Teacher accounts cannot use the public forgot-password flow. Contact your admin to resend credentials.
                You will receive a new temporary password and must change it on your next sign-in.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
            <div>
              <div className="font-medium">Sign out of all devices</div>
              <p className="text-sm text-muted-foreground">
                End every active session attached to this teacher account.
              </p>
            </div>
            <Button variant="outline" loading={logoutAllBusy} loadingText="Signing out..." onClick={() => void onLogoutAll()}>
              Sign out everywhere
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
