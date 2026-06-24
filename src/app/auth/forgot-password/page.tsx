"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAdminOrTeacherBlock, setIsAdminOrTeacherBlock] = useState(false);
  const [token, setToken] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setToken("");
    setResetUrl("");
    setEmailHint("");
    setIsAdminOrTeacherBlock(false);
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setToken(result.debugToken ?? "");
      setResetUrl(result.debugResetUrl ?? "");
      setEmailHint(result.emailHint ?? "");
      notifySuccess("Reset email processed", result.message);
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : "Unable to send reset email.";
      // Detect the blocked-role response from the backend and show a friendlier UI.
      const isBlocked =
        errorMessage.toLowerCase().includes("administrator accounts") ||
        errorMessage.toLowerCase().includes("teacher accounts");
      if (isBlocked) {
        setIsAdminOrTeacherBlock(true);
        setMessage(errorMessage);
      } else {
        notifyError("Reset request failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-sm"
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo href="/" />
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="font-display text-3xl font-bold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email for your account. If it exists, you will receive a message with a link to set a new password.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@mooreskillup.com"
            required
          />
          <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} loadingText="Sending...">
            Send reset email
          </Button>
        </form>

        {isAdminOrTeacherBlock && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 dark:border-amber-700 dark:bg-amber-500/10">
            <div className="font-semibold text-amber-900 dark:text-amber-100">Password reset not available</div>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Admin and teacher accounts cannot use the public password reset flow. Please contact your Super Admin or platform admin to have your credentials resent. They will email you a new temporary password, and you will be asked to change it on your next login.
            </p>
          </div>
        )}

        {message && !isAdminOrTeacherBlock && (
          <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        {emailHint && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {emailHint}
          </div>
        )}

        {token && (
          <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Development email preview token: <span className="font-semibold text-foreground">{token}</span>
            {resetUrl && (
              <div className="mt-2 break-all text-xs text-muted-foreground">
                {resetUrl}
              </div>
            )}
            <div className="mt-3">
              <Link href={`/auth/reset-password?token=${token}`} className="font-semibold text-primary hover:text-accent">
                Continue to reset password
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
