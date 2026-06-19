"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { type Interest, type TrackName } from "@/lib/mock-data";
import { usePlatformTaxonomy } from "@/lib/taxonomy";
import { BrandLogo } from "@/components/shared/BrandLogo";


export default function AuthRegisterPage() {
  const { register, logout } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const { interests, trackOptionsByInterest, isLoading: isLoadingTaxonomy, error: taxonomyError } =
    usePlatformTaxonomy();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>("Backend Development");
  const [primaryTrack, setPrimaryTrack] = useState<TrackName>("Backend with Python");
  const [secondaryTracks, setSecondaryTracks] = useState<TrackName[]>([]);
  const [loading, setLoading] = useState(false);
  const trackOptions = useMemo(
    () => trackOptionsByInterest[selectedInterest] ?? [],
    [selectedInterest, trackOptionsByInterest],
  );

  useEffect(() => {
    if (!interests.length) return;
    if (!interests.includes(selectedInterest)) {
      const nextInterest = interests[0];
      setSelectedInterest(nextInterest);
      setPrimaryTrack(
        (trackOptionsByInterest[nextInterest] ?? [])[0] ?? ("Backend with Python" as TrackName),
      );
      setSecondaryTracks([]);
      return;
    }
    if (trackOptions.length && !trackOptions.includes(primaryTrack)) {
      setPrimaryTrack(trackOptions[0]);
      setSecondaryTracks([]);
    }
    setSecondaryTracks((current) =>
      current.filter((track) => trackOptions.includes(track) && track !== primaryTrack).slice(0, 2),
    );
  }, [interests, primaryTrack, selectedInterest, trackOptions, trackOptionsByInterest]);

  const setField =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const chooseInterest = (interest: Interest) => {
    setSelectedInterest(interest);
    setPrimaryTrack(trackOptionsByInterest[interest][0]);
    setSecondaryTracks([]);
  };

  const selectedTracks = [primaryTrack, ...secondaryTracks].filter(Boolean);

  const toggleSecondaryTrack = (track: TrackName) => {
    setSecondaryTracks((current) => {
      if (track === primaryTrack) return current;
      if (current.includes(track)) {
        return current.filter((item) => item !== track);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, track];
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!interests.length || !trackOptions.length) {
      const message = "Registration is unavailable until an admin adds categories and tracks.";
      notifyError("Registration unavailable", message);
      return;
    }
    if (form.password !== form.confirm) {
      const message = "Passwords do not match.";
      notifyError("Password mismatch", message);
      return;
    }
    setLoading(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.username,
        interests: [selectedInterest],
        selectedInterest,
        selectedTrack: primaryTrack,
        selectedTracks,
      });
      logout();
      notifySuccess("Account created", "Login with your new account to continue.");
      router.push("/auth/login");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to create your account.";
      notifyError("Registration failed", message);
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
            Personalized onboarding
          </div>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-bold leading-tight">
            Create an account around the exact learning path you want to take.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Start with your program, then choose a track so the dashboard,
            weekly lessons, and premium upsell all feel personal from day one.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {interests.map((interest) => (
            <span key={interest} className="rounded-full border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
              {interest}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
            <BrandLogo href="/" />
            </Link>
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your details, pick a program, choose one primary track, and optionally add up to two supporting tracks.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Username" value={form.username} onChange={setField("username")} required />
              <Input label="Email" type="email" value={form.email} onChange={setField("email")} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordInput label="Password" value={form.password} onChange={setField("password")} required />
              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={setField("confirm")}
                required
              />
            </div>

            <div>
              <div className="text-sm font-medium text-foreground">Choose your main academy path</div>
              {taxonomyError && (
                <p className="mt-2 text-sm text-destructive">{taxonomyError}</p>
              )}
              {!taxonomyError && !isLoadingTaxonomy && !interests.length && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Registration opens after an admin adds categories and tracks.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const active = selectedInterest === interest;
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => chooseInterest(interest)}
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

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ArrowRight className="h-4 w-4 text-primary" />
                Choose your primary track inside {selectedInterest}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        This is your main track. The dashboard and recommendations will prioritize it first.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ArrowRight className="h-4 w-4 text-primary" />
                Add up to two secondary tracks
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Total tracks cannot exceed 3. Secondary tracks broaden recommendations without changing your primary learning direction.
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {trackOptions.map((track) => {
                  if (track === primaryTrack) return null;
                  const active = secondaryTracks.includes(track);
                  const disabled = !active && secondaryTracks.length >= 2;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => toggleSecondaryTrack(track)}
                      disabled={disabled}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {active ? "Added as a secondary track." : "Optional supporting track."}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Selected tracks: {selectedTracks.join(", ")}
              </div>
            </div>


            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              loading={loading}
              loadingText="Logging in..."
              disabled={isLoadingTaxonomy || !interests.length || !trackOptions.length}
            >
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
              Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
