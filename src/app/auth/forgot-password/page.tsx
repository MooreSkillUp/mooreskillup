"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setToken("");
    setResetUrl("");
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setToken(result.debugToken ?? "");
      setResetUrl(result.debugResetUrl ?? "");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send reset email.");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">MooreSkillUp</span>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="font-display text-3xl font-bold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Request a reset email and continue with the token-based password reset flow.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@mooreskillup.com"
            required
          />
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset email"}
          </Button>
        </form>

        {error && <div className="mt-6 text-sm text-destructive">{error}</div>}

        {message && (
          <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            {message}
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
      </motion.div>
    </div>
  );
}
