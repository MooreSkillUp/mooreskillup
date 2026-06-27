"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Save, X } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { CommunityLinks } from "../../components/dashboard/CommunityLinks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui-kit/Button";
import { Input } from "../../components/ui-kit/Input";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { AVATARS } from "../../lib/avatars";
import { toDisplayName, useAuth } from "../../lib/auth";
import { useFeedback } from "../../lib/feedback";
import { trackOptionsByInterest } from "../../lib/mock-data";
import { usePlatformTaxonomy } from "../../lib/taxonomy";

export default function SettingsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const { user, updateUser, toggleTwoFactor, logoutAll } = useAuth();
  const { categories } = usePlatformTaxonomy();
  const academicPath = user?.selectedInterest ?? "Backend Development";
  const [username, setUsername] = useState(user?.username ?? "");
  const [saved, setSaved] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

  const onToggleTwoFactor = async (enabled: boolean) => {
    setTwoFactorBusy(true);
    try {
      await toggleTwoFactor(enabled);
      notifySuccess(
        enabled ? "Two-factor sign-in enabled" : "Two-factor sign-in disabled",
        enabled ? "We'll email a code each time you sign in." : undefined,
      );
    } catch (error) {
      notifyError("Couldn't update 2FA", error instanceof Error ? error.message : "Request failed.");
    } finally {
      setTwoFactorBusy(false);
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

  const availableTracks = useMemo(() => {
    const categoryTracks = categories
      .filter((category) => category.name === academicPath || category.program === academicPath)
      .flatMap((category) => category.subcategories.map((subcategory) => subcategory.name));

    const fallbackTracks =
      trackOptionsByInterest[academicPath as keyof typeof trackOptionsByInterest] ?? [];

    return Array.from(new Set(categoryTracks.length ? categoryTracks : fallbackTracks));
  }, [academicPath, categories]);

  const initialSelectedTracks =
    user?.selectedTracks?.length
      ? user.selectedTracks
      : user?.selectedTrack
        ? [user.selectedTrack]
        : availableTracks.slice(0, 1);

  const [primaryTrack, setPrimaryTrack] = useState<string>(initialSelectedTracks[0] ?? availableTracks[0] ?? "");
  const [secondaryTracks, setSecondaryTracks] = useState<string[]>(initialSelectedTracks.slice(1, 3));

  const selectedTracks = [primaryTrack, ...secondaryTracks].filter(Boolean);
  const hasTrackChanges =
    JSON.stringify(selectedTracks) !== JSON.stringify(initialSelectedTracks.slice(0, 3));

  const toggleSecondaryTrack = (track: string) => {
    setSecondaryTracks((current) => {
      if (track === primaryTrack) return current;
      if (current.includes(track)) {
        return current.filter((item) => item !== track);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, track];
    });
  };

  const persistProfile = async () => {
    const nextTracks = selectedTracks.length ? selectedTracks : availableTracks.slice(0, 1);
    setIsSaving(true);

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
      setIsConfirmOpen(false);
      setTimeout(() => setSaved(false), 2000);
      notifySuccess("Profile updated", "Your learning preferences were saved successfully.");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to save your profile.";
      notifyError("Unable to save profile", message);
    } finally {
      setIsSaving(false);
    }
  };

  const onProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasTrackChanges) {
      setIsConfirmOpen(true);
      return;
    }
    await persistProfile();
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

        <CommunityLinks />

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Session management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign out from every device and browser session connected to your account.
          </p>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-border bg-background p-4">
            <div>
              <div className="font-medium">All active sessions</div>
              <div className="text-sm text-muted-foreground">
                This ends every current session and clears your current device too.
              </div>
            </div>
            <Button variant="outline" loading={logoutAllBusy} loadingText="Signing out..." onClick={() => void onLogoutAll()}>
              Sign out of all devices
            </Button>
          </div>
        </section>

        {user?.role === "admin" && (
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold">Security</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an extra layer to your admin account. When two-factor sign-in is on, we email a one-time
              code each time you log in.
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Email two-factor sign-in</div>
                <div className="text-sm text-muted-foreground">
                  {user.twoFactorEnabled ? "Currently on" : "Currently off"}
                </div>
              </div>
              <Button
                variant={user.twoFactorEnabled ? "outline" : "accent"}
                loading={twoFactorBusy}
                loadingText="Updating..."
                onClick={() => void onToggleTwoFactor(!user.twoFactorEnabled)}
              >
                {user.twoFactorEnabled ? "Turn off" : "Turn on"}
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Student profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email and academic path stay locked after registration. You can still refine your primary and secondary tracks inside your path.
          </p>

          <form onSubmit={onProfile} className="mt-5 space-y-5">
            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="text-sm font-medium text-foreground">Avatar</div>
              <p className="mt-1 text-sm text-muted-foreground">Pick an avatar — it shows across the app.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {AVATARS.map((avatar) => {
                  const active = user?.avatarUrl === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      title={avatar.label}
                      onClick={() => void updateUser({ avatarUrl: avatar.id })}
                      className={`rounded-full p-0.5 transition ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-105"}`}
                    >
                      <UserAvatar avatarId={avatar.id} size={48} />
                    </button>
                  );
                })}
              </div>
            </div>

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
                Primary track
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Your dashboard prioritizes this track first.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableTracks.map((track) => {
                  const active = primaryTrack === track;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => {
                        setPrimaryTrack(track);
                        setSecondaryTracks((current) => current.filter((item) => item !== track));
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {active ? "Primary track selected." : "Set as your primary learning focus."}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Current primary track: <span className="font-semibold text-foreground">{primaryTrack || "Not set"}</span>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Secondary tracks
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Add up to two extra tracks. Enrolled courses and progress remain unchanged when you update them.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableTracks.map((track) => {
                  if (track === primaryTrack) return null;
                  const active = secondaryTracks.includes(track);
                  const disabled = !active && secondaryTracks.length >= 2;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => {
                        toggleSecondaryTrack(track);
                      }}
                      disabled={disabled}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {active ? "Included as a supporting track." : "Optional supporting track."}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Plus className="h-4 w-4 text-primary" />
                  Secondary tracks
                </div>
                {secondaryTracks.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {secondaryTracks.map((track) => (
                      <span
                        key={track}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                      >
                        {track}
                        <button
                          type="button"
                          onClick={() => toggleSecondaryTrack(track)}
                          className="text-muted-foreground transition hover:text-foreground"
                          aria-label={`Remove ${track}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">
                    No secondary tracks selected yet. You can add up to two.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="font-semibold">Track update policy</div>
              <div className="mt-2">
                Changing your tracks will update your recommendations and learning path. Your roadmap and progress will remain unchanged.
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.2em]">
                Program stays locked. Tracks affect recommendations only.
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              Program stays locked. Track updates only change recommendations, browse suggestions, and learning path prioritization.
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" variant="accent" loading={isSaving} loadingText="Saving changes...">
                <Save className="h-4 w-4" /> Save changes
              </Button>
              {saved && <span className="text-sm text-success">Saved.</span>}
            </div>
          </form>
        </section>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update tracks?</DialogTitle>
            <DialogDescription>
              Changing your tracks will update your recommendations and learning path.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
            Your roadmap and progress will remain unchanged.
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div>
              Primary track: <span className="font-semibold text-foreground">{primaryTrack || "Not set"}</span>
            </div>
            <div className="mt-2">
              Secondary tracks:{" "}
              <span className="font-semibold text-foreground">
                {secondaryTracks.length ? secondaryTracks.join(", ") : "None selected"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="accent" onClick={() => void persistProfile()} loading={isSaving} loadingText="Updating tracks...">
              Update Tracks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
