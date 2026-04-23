"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherSettingsPage() {
  const { profile, updateProfile, changePassword, error } = useTeacherPlatform();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  const saveSettings = async () => {
    await updateProfile({ displayName });
    setMessage("Teacher settings saved");
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage("Enter your current password and a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirm password must match.");
      return;
    }
    await changePassword(currentPassword, newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
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

            <Input label="Academic Track" value={profile.track} readOnly />

            <Button variant="accent" onClick={saveSettings}>
              <Save className="h-4 w-4" /> Save settings
            </Button>
            {message && <div className="text-sm text-success">{message}</div>}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Password update
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold">Change your password</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Teachers created by admin should change the temporary password after first login.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <Button variant="outline" onClick={savePassword}>
              Update password
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
