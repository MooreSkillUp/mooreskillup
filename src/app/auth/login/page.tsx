"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

/**
 * Where to land after signing in.
 *
 * Middleware appends ?next=<path> when it bounces someone off a protected page,
 * so a deep link into a course survives the detour instead of dumping them on
 * the dashboard. Only same-origin relative paths are honoured — anything
 * starting with "//" or carrying a scheme would be an open redirect.
 */
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  // Bouncing back into the auth flow would loop.
  if (raw.startsWith("/auth/")) return null;
  return raw;
}

export default function AuthLoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired")) setExpiredNotice(true);
    setNextPath(safeNextPath(params.get("next")));
  }, []);

  const landingRoute = (user: Parameters<typeof getHomeRouteForUser>[0]) =>
    nextPath ?? getHomeRouteForUser(user);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setExpiredNotice(false);
    try {
      const result = await login(email.trim(), password);
      if ("twoFactorRequired" in result) {
        setTwoFactorUserId(result.userId);
        notifySuccess("Check your email", "We sent a 6-digit code to finish signing in.");
        setLoading(false);
        return;
      }
      router.push(landingRoute(result));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to sign in.";
      setError(message);
      notifyError("Login failed", message);
      setLoading(false);
    }
  };

  const onVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!twoFactorUserId) return;
    setLoading(true);
    setError("");
    try {
      const nextUser = await verifyTwoFactor(twoFactorUserId, code.trim());
      router.push(landingRoute(nextUser));
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "That code was not accepted.";
      setError(message);
      notifyError("Verification failed", message);
      setLoading(false);
    }
  };

  if (twoFactorUserId) {
    return (
      <AuthScreen
        title="Confirm it's you"
        subtitle={
          <>
            We emailed a 6-digit code to{" "}
            <span className="font-semibold text-foreground">{email}</span>. It expires in 10 minutes.
          </>
        }
        error={error}
      >
        <form onSubmit={onVerify} className="space-y-4" noValidate>
          <Input
            label="Verification code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
          />

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            loading={loading}
            loadingText="Verifying..."
            disabled={code.length !== 6}
          >
            Verify and sign in
          </Button>

          <button
            type="button"
            onClick={() => {
              setTwoFactorUserId(null);
              setCode("");
              setError("");
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </form>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      error={error}
      notice={
        expiredNotice
          ? "You were signed out for your security. Sign in again to continue."
          : undefined
      }
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-semibold text-primary hover:text-accent">
            Create one
          </Link>
        </>
      }
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

        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-sm font-semibold text-primary hover:text-accent"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          loading={loading}
          loadingText="Signing in..."
          disabled={!email.trim() || !password}
        >
          Sign in
        </Button>
      </form>
    </AuthScreen>
  );
}
