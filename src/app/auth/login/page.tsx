"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function AuthLoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("expired")) {
      setExpiredNotice(true);
    }
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if ("twoFactorRequired" in result) {
        setTwoFactorUserId(result.userId);
        notifySuccess("Check your email", "We sent a 6-digit code to finish signing in.");
        setLoading(false);
        return;
      }
      router.push(getHomeRouteForUser(result));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to sign in.";
      notifyError("Login failed", message);
      setLoading(false);
    }
  };

  const onVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!twoFactorUserId) return;
    setLoading(true);
    try {
      const nextUser = await verifyTwoFactor(twoFactorUserId, code.trim());
      router.push(getHomeRouteForUser(nextUser));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "That code was not accepted.";
      notifyError("Verification failed", message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.22),transparent_24%)] p-10 text-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
          <BrandLogo href="/" />
          </Link>
          <ThemeToggle />
        </div>
        <div>
          <div className="inline-flex rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Student access
          </div>
          <h1 className="mt-6 max-w-lg font-display text-5xl font-bold leading-tight">
            Return to your personalized learning command center.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Sign in to continue the tracks, quizzes, rewards, and unlocked content
            built around your goals.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["1.2k+", "Learners"],
            ["10+", "Active Cartegories"],
            ["40+", "Active Tracks"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="font-display text-2xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
            <BrandLogo href="/" />
            </Link>
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your dashboard, interests, wishlist, and progress.
          </p>

          {expiredNotice && (
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
              Your session expired for your security. Please log in again to continue.
            </div>
          )}

          {twoFactorUserId ? (
            <form onSubmit={onVerify} className="mt-8 space-y-4">
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Enter the 6-digit code we emailed to <span className="font-semibold text-foreground">{email}</span>.
                It expires in 10 minutes.
              </div>
              <Input
                label="Verification code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                required
              />
              <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} loadingText="Verifying..." disabled={code.length !== 6}>
                Verify and sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorUserId(null);
                  setCode("");
                }}
                className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Input
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex.pro@mooreskillup.com"
                required
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <div className="text-right text-sm">
                <Link href="/auth/forgot-password" className="font-semibold text-primary hover:text-accent">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} loadingText="Signing in...">
                Login
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Do not have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-primary hover:text-accent">
              Create one
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
