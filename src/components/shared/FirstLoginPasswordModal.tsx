"use client";

import { useState } from "react";
import { Button } from "@/components/ui-kit/Button";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useFeedback } from "@/lib/feedback";

interface FirstLoginPasswordModalProps {
  open: boolean;
  roleLabel: string;
  onChangePassword: (newPassword: string) => Promise<void>;
}

export function FirstLoginPasswordModal({
  open,
  roleLabel,
  onChangePassword,
}: FirstLoginPasswordModalProps) {
  const { notifyError, notifySuccess } = useFeedback();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promptMessage, setPromptMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!newPassword.trim()) {
      setPromptMessage("Enter a new password to continue.");
      notifyError("Password required", "Enter a new password to continue.");
      return;
    }
    if (newPassword.length < 8) {
      setPromptMessage("Password must be at least 8 characters.");
      notifyError("Password too short", "Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPromptMessage("New password and confirm password must match.");
      notifyError("Password mismatch", "New password and confirm password must match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await onChangePassword(newPassword);
      setPromptMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      notifySuccess("Password updated", "Your account is now secured with your new password.");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unable to update password.";
      setPromptMessage(message);
      notifyError("Unable to update password", message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section
        className="w-full max-w-2xl rounded-[2rem] border border-primary/30 bg-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-password-title"
      >
        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          First login security
        </div>
        <h2 id="first-login-password-title" className="mt-2 font-display text-2xl font-bold">
          Update your temporary password
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Your {roleLabel} account was set up with a temporary password. You must set a new password before
          continuing. If an admin resends your credentials, you will be asked to change your password again on
          your next sign-in.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button variant="accent" onClick={() => void submit()} loading={passwordSaving} loadingText="Saving password...">
            Save new password
          </Button>
        </div>
        {promptMessage && (
          <p
            className={`mt-3 text-sm ${
              promptMessage.includes("successfully") ? "text-success" : "text-destructive"
            }`}
          >
            {promptMessage}
          </p>
        )}
      </section>
    </div>
  );
}
