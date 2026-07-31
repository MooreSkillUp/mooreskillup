"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [staffAccountBlocked, setStaffAccountBlocked] = useState(false);
  const [token, setToken] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setToken("");
    setResetUrl("");
    setEmailHint("");
    setStaffAccountBlocked(false);
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setSent(true);
      setMessage(result.message);
      setToken(result.debugToken ?? "");
      setResetUrl(result.debugResetUrl ?? "");
      setEmailHint(result.emailHint ?? "");
      notifySuccess("Check your inbox", result.message);
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : "Unable to send reset email.";
      // Staff accounts are reset by an admin, not through this flow. Say so
      // rather than showing a generic failure the person can't act on.
      const isStaffAccount =
        errorMessage.toLowerCase().includes("administrator accounts") ||
        errorMessage.toLowerCase().includes("teacher accounts");
      if (isStaffAccount) {
        setStaffAccountBlocked(true);
      } else {
        setError(errorMessage);
        notifyError("Reset request failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <>
      Remembered it?{" "}
      <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
        Back to sign in
      </Link>
    </>
  );

  if (staffAccountBlocked) {
    return (
      <AuthScreen
        title="Ask an admin to reset this"
        subtitle="Admin and teacher accounts don't use the public reset flow."
        footer={backToLogin}
      >
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-100">
          Contact your Super Admin or platform admin and ask them to resend your credentials.
          They&apos;ll email you a temporary password, and you&apos;ll be asked to change it the
          next time you sign in.
        </div>

        <button
          type="button"
          onClick={() => setStaffAccountBlocked(false)}
          className="mt-4 w-full rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Try a different email
        </button>
      </AuthScreen>
    );
  }

  if (sent) {
    return (
      <AuthScreen
        title="Check your inbox"
        subtitle={
          <>
            If an account exists for{" "}
            <span className="font-semibold text-foreground">{email}</span>, we&apos;ve sent a link
            to set a new password. It can take a minute to arrive — check spam too.
          </>
        }
        footer={backToLogin}
      >
        <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>{message}</span>
        </div>

        {emailHint && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-100">
            {emailHint}
          </div>
        )}

        {/* Only ever populated when the backend is running in DEBUG. */}
        {token && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4 text-sm">
            <div className="font-semibold text-foreground">Development preview</div>
            <div className="mt-1 break-all text-xs text-muted-foreground">{resetUrl || token}</div>
            <Link
              href={`/auth/reset-password?token=${token}`}
              className="mt-3 inline-block font-semibold text-primary hover:text-accent"
            >
              Continue to reset password
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 w-full rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Send to a different email
        </button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new one."
      error={error}
      footer={backToLogin}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
        />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          loading={loading}
          loadingText="Sending..."
          disabled={!email.trim()}
        >
          Send reset link
        </Button>
      </form>
    </AuthScreen>
  );
}
