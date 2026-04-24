"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/lib/auth";

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
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [loading, setLoading] = useState(false);
  const fromEmailLink = Boolean(initialToken);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setMessageTone("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (!token.trim()) {
      setMessageTone("error");
      setMessage("Reset link is missing or invalid. Open the link from your email again.");
      return;
    }
    setLoading(true);
    setMessage("");
    const result = await resetPassword(token.trim(), password);
    setMessageTone(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) {
      setTimeout(() => router.push("/auth/login"), 2000);
    }
    setLoading(false);
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

        <h1 className="font-display text-3xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fromEmailLink
            ? "Choose a new password below. You will be redirected to sign in when it succeeds."
            : "Paste the reset link from your email into the address bar, or enter the token from the email and choose a new password."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {!fromEmailLink ? (
            <Input
              label="Reset token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="From your reset email"
              required
            />
          ) : null}
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>

        {message && (
          <div
            className={
              messageTone === "success"
                ? "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                : messageTone === "error"
                  ? "mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  : "mt-6 text-sm text-muted-foreground"
            }
          >
            {message}
            {messageTone === "success" && (
              <p className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-200/90">
                Taking you to the login page… or{" "}
                <Link href="/auth/login" className="font-semibold underline underline-offset-2">
                  go now
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
