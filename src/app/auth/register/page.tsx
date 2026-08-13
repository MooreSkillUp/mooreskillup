"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { usePlatformTaxonomy } from "@/lib/taxonomy";
import { type Interest, type TrackName } from "@/lib/taxonomy-types";

const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LIFETIME_SECONDS = 10 * 60;
const MAX_SECONDARY_TRACKS = 2;

/**
 * Survives a refresh mid-verification. Without this, closing the tab between
 * "we emailed you a code" and entering it stranded the person completely: the
 * account exists as a pending registration, but the browser has lost the id
 * needed to finish, and re-registering the same email fails.
 */
const PENDING_KEY = "mooreskillup.pendingRegistration";

interface PendingVerification {
  pendingId: string;
  email: string;
  startedAt: number;
}

function readPending(): PendingVerification | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingVerification;
    if (!parsed?.pendingId || !parsed?.email) return null;
    // A code older than its lifetime is useless — start clean.
    if (Date.now() - parsed.startedAt > CODE_LIFETIME_SECONDS * 1000) {
      window.sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function AuthRegisterPage() {
  const { initiateRegister, verifyRegister, resendRegisterCode } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const {
    interests,
    trackOptionsByInterest,
    isLoading: isLoadingTaxonomy,
    error: taxonomyError,
  } = usePlatformTaxonomy();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>("");
  const [primaryTrack, setPrimaryTrack] = useState<TrackName>("");
  const [secondaryTracks, setSecondaryTracks] = useState<TrackName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const trackOptions = useMemo(
    () => trackOptionsByInterest[selectedInterest] ?? [],
    [selectedInterest, trackOptionsByInterest],
  );

  // Restore an interrupted verification on mount.
  useEffect(() => {
    const restored = readPending();
    if (restored) setPending(restored);
  }, []);

  // Keep the selections valid as the live taxonomy arrives or changes.
  useEffect(() => {
    if (!interests.length) return;

    if (!selectedInterest || !interests.includes(selectedInterest)) {
      const next = interests[0];
      setSelectedInterest(next);
      setPrimaryTrack((trackOptionsByInterest[next] ?? [])[0] ?? "");
      setSecondaryTracks([]);
      return;
    }
    if (trackOptions.length && !trackOptions.includes(primaryTrack)) {
      setPrimaryTrack(trackOptions[0]);
      setSecondaryTracks([]);
    }
  }, [interests, primaryTrack, selectedInterest, trackOptions, trackOptionsByInterest]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const startPending = useCallback((next: PendingVerification) => {
    setPending(next);
    setResendIn(RESEND_COOLDOWN_SECONDS);
    try {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    } catch {
      // Private-browsing modes can refuse storage; verification still works in
      // this tab, it just won't survive a refresh.
    }
  }, []);

  const clearPending = useCallback(() => {
    setPending(null);
    setCode("");
    setError("");
    try {
      window.sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* nothing to clean up */
    }
  }, []);

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  const toggleSecondaryTrack = (track: TrackName) => {
    setSecondaryTracks((current) => {
      if (track === primaryTrack) return current;
      if (current.includes(track)) return current.filter((item) => item !== track);
      if (current.length >= MAX_SECONDARY_TRACKS) return current;
      return [...current, track];
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!interests.length || !trackOptions.length) {
      setError("Registration opens once an admin has added categories and tracks.");
      return;
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const result = await initiateRegister({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        // Shown around the app; the certificate uses firstName + lastName.
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || form.username.trim(),
        interests: [selectedInterest],
        selectedInterest,
        selectedTrack: primaryTrack,
        selectedTracks: [primaryTrack, ...secondaryTracks].filter(Boolean),
      });
      startPending({ ...result, startedAt: Date.now() });
      notifySuccess("Check your email", `We sent a 6-digit code to ${result.email}.`);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to create your account.";
      setError(message);
      notifyError("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending || code.length !== 6) return;

    setVerifying(true);
    setError("");
    try {
      await verifyRegister(pending.pendingId, code.trim());
      try {
        window.sessionStorage.removeItem(PENDING_KEY);
      } catch {
        /* nothing to clean up */
      }
      notifySuccess("You're in", "Welcome to MooreSkillUp.");
      router.push("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "That code wasn't accepted.";
      setError(message);
      setCode("");
      notifyError("Verification failed", message);
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (!pending || resendIn > 0) return;
    setError("");
    try {
      await resendRegisterCode(pending.pendingId);
      startPending({ ...pending, startedAt: Date.now() });
      notifySuccess("Code resent", "A new 6-digit code is on its way.");
    } catch (resendError) {
      const message = resendError instanceof Error ? resendError.message : "Unable to resend code.";
      setError(message);
      notifyError("Resend failed", message);
    }
  };

  // ── Verification step ────────────────────────────────────────────────────
  if (pending) {
    return (
      <AuthScreen
        title="Verify your email"
        subtitle={
          <>
            Enter the 6-digit code we sent to{" "}
            <span className="font-semibold text-foreground">{pending.email}</span>. It expires in 10
            minutes — check spam if it hasn&apos;t arrived.
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
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            className="text-center font-mono text-3xl tracking-[0.4em] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
          />

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            loading={verifying}
            loadingText="Verifying..."
            disabled={code.length !== 6}
          >
            Verify and finish
          </Button>

          <div className="flex items-center justify-between pt-1 text-sm">
            <button
              type="button"
              onClick={onResend}
              disabled={resendIn > 0}
              className={
                resendIn > 0
                  ? "cursor-not-allowed font-semibold text-muted-foreground"
                  : "font-semibold text-primary transition-colors hover:text-accent"
              }
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={clearPending}
              className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        </form>
      </AuthScreen>
    );
  }

  // ── Sign-up step ─────────────────────────────────────────────────────────
  const noTaxonomy = !isLoadingTaxonomy && !taxonomyError && !interests.length;

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Pick the path you want to learn — we'll shape your dashboard and recommendations around it."
      error={error}
      width="lg"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Collected here rather than later because this is what a
              certificate prints, and a credential carrying a username is
              worthless to the person holding it. */}
          <Input
            label="First name"
            value={form.firstName}
            onChange={setField("firstName")}
            autoComplete="given-name"
            autoFocus
            required
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={setField("lastName")}
            autoComplete="family-name"
            required
          />
          <Input
            label="Username"
            value={form.username}
            onChange={setField("username")}
            autoComplete="username"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={setField("email")}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={setField("password")}
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
          />
          <PasswordInput
            label="Confirm password"
            value={form.confirm}
            onChange={setField("confirm")}
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <div className="text-sm font-medium text-foreground">Choose your learning path</div>

          {taxonomyError && <p className="mt-2 text-sm text-destructive">{taxonomyError}</p>}
          {isLoadingTaxonomy && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-9 w-36 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          )}
          {noTaxonomy && (
            <p className="mt-2 text-sm text-muted-foreground">
              Registration opens once an admin has added categories and tracks.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {interests.map((interest) => {
              const active = selectedInterest === interest;
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => {
                    setSelectedInterest(interest);
                    setPrimaryTrack((trackOptionsByInterest[interest] ?? [])[0] ?? "");
                    setSecondaryTracks([]);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        {trackOptions.length > 0 && (
          <>
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="text-sm font-medium text-foreground">
                Your main track in {selectedInterest}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Recommendations lead with this one.
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {trackOptions.map((track) => {
                  const active = primaryTrack === track;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => {
                        setPrimaryTrack(track);
                        setSecondaryTracks((current) => current.filter((item) => item !== track));
                      }}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "border-accent bg-accent/10 text-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {track}
                    </button>
                  );
                })}
              </div>
            </div>

            {trackOptions.length > 1 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="text-sm font-medium text-foreground">
                  Add up to {MAX_SECONDARY_TRACKS} more{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  These broaden your recommendations without changing your main direction.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {trackOptions.map((track) => {
                    if (track === primaryTrack) return null;
                    const active = secondaryTracks.includes(track);
                    const disabled = !active && secondaryTracks.length >= MAX_SECONDARY_TRACKS;
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() => toggleSecondaryTrack(track)}
                        disabled={disabled}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          active
                            ? "border-primary bg-primary/10 text-foreground shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {track}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          loading={loading}
          loadingText="Creating account..."
          disabled={
            isLoadingTaxonomy ||
            !interests.length ||
            !trackOptions.length ||
            !form.firstName.trim() ||
            !form.lastName.trim() ||
            !form.username.trim() ||
            !form.email.trim() ||
            !form.password ||
            !form.confirm
          }
        >
          Create account
        </Button>
      </form>
    </AuthScreen>
  );
}
