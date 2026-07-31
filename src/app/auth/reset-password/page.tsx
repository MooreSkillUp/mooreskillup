"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  return <ResetPasswordShell initialToken={searchParams.get("token") ?? ""} />;
}

function ResetPasswordShell({ initialToken = "" }: { initialToken?: string }) {
  const { resetPassword } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const fromEmailLink = Boolean(initialToken);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    if (!token.trim()) {
      setError("This reset link is missing its token. Open the link from your email again.");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token.trim(), password);
    setLoading(false);

    if (result.ok) {
      setDone(true);
      notifySuccess("Password updated", result.message);
      setTimeout(() => router.push("/auth/login"), 2000);
      return;
    }

    setError(result.message);
    notifyError("Password reset failed", result.message);
  };

  if (done) {
    return (
      <AuthScreen title="Password updated" subtitle="You can sign in with your new password now.">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-500/10 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Taking you to sign in&hellip; or{" "}
            <Link href="/auth/login" className="font-semibold underline underline-offset-2">
              go now
            </Link>
            .
          </span>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle={
        fromEmailLink
          ? "Pick something you haven't used here before."
          : "Enter the token from your reset email, then choose a new password."
      }
      error={error}
      footer={
        <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {!fromEmailLink && (
          <Input
            label="Reset token"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setError("");
            }}
            placeholder="From your reset email"
            autoFocus
            required
          />
        )}

        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          autoFocus={fromEmailLink}
          required
        />
        {tooShort && (
          <p className="-mt-2 text-xs text-muted-foreground">
            {MIN_PASSWORD_LENGTH - password.length} more character
            {MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} to go.
          </p>
        )}

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setError("");
          }}
          required
        />
        {mismatch && <p className="-mt-2 text-xs text-destructive">These don&apos;t match yet.</p>}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          loading={loading}
          loadingText="Updating..."
          disabled={!password || !confirm || mismatch || tooShort}
        >
          Update password
        </Button>
      </form>
    </AuthScreen>
  );
}
