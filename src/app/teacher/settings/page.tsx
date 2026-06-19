"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherSettingsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { profile, updateProfile, error } = useTeacherPlatform();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName });
      setMessage("Teacher settings saved");
      setMessageTone("success");
      notifySuccess("Teacher settings saved");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unable to save settings.";
      setMessage(message);
      setMessageTone("error");
      notifyError("Unable to save settings", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Settings
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Teacher profile settings</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Only essential teacher identity fields remain here. Email, program, and track stay locked to the admin assignment.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <Input label="Email" value={profile.email} readOnly />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Program" value={profile.program} readOnly />
              <Input label="Default Track" value={profile.track} readOnly />
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
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
              </div>
            </div>

            <Button variant="accent" onClick={saveSettings} loading={saving} loadingText="Saving settings...">
              <Save className="h-4 w-4" /> Save settings
            </Button>
            {message && (
              <div className={`text-sm ${messageTone === "success" ? "text-success" : "text-destructive"}`}>
                {message}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
