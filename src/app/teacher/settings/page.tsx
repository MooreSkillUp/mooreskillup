"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function TeacherSettingsPage() {
  const { profile, updateProfile } = useTeacherWorkspace();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  const saveSettings = () => {
    updateProfile({ displayName });
    setMessage("Teacher settings saved");
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
            Only essential teacher identity fields remain here. Email and academic track stay locked.
          </p>
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

            <Input label="Academic Track" value={profile.track} readOnly />

            <Button variant="accent" onClick={saveSettings}>
              <Save className="h-4 w-4" /> Save settings
            </Button>
            {message && <div className="text-sm text-success">{message}</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
