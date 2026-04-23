"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { type Interest, type TrackName } from "@/lib/mock-data";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

export default function AuthRegisterPage() {
  const { register } = useAuth();
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
  const [selectedTrack, setSelectedTrack] = useState<TrackName>("Backend with Python");
  const [error, setError] = useState("");
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
      setSelectedTrack(
        (trackOptionsByInterest[nextInterest] ?? [])[0] ?? ("Backend with Python" as TrackName),
      );
      return;
    }
    if (trackOptions.length && !trackOptions.includes(selectedTrack)) {
      setSelectedTrack(trackOptions[0]);
    }
  }, [interests, selectedInterest, selectedTrack, trackOptions, trackOptionsByInterest]);

  const setField =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const chooseInterest = (interest: Interest) => {
    setSelectedInterest(interest);
    setSelectedTrack(trackOptionsByInterest[interest][0]);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!interests.length || !trackOptions.length) {
      setError("Registration is unavailable until an admin adds categories and tracks.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const nextUser = await register({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.username,
        interests: [selectedInterest],
        selectedInterest,
        selectedTrack,
      });
      router.push(getHomeRouteForUser(nextUser));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.22),transparent_24%)] p-10 text-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">MooreSkillUp</div>
              <div className="text-sm text-muted-foreground">Learning Academy</div>
            </div>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">MooreSkillUp</span>
            </Link>
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your details, pick a program, and choose the exact track you want to follow.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Username" value={form.username} onChange={setField("username")} required />
              <Input label="Email" type="email" value={form.email} onChange={setField("email")} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Password" type="password" value={form.password} onChange={setField("password")} required />
              <Input label="Confirm password" type="password" value={form.confirm} onChange={setField("confirm")} required />
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
                Choose your track inside {selectedInterest}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {trackOptions.map((track) => {
                  const active = selectedTrack === track;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => setSelectedTrack(track)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{track}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Your dashboard will prioritize this track, its weekly lessons,
                        projects, and premium unlock flow.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={loading || isLoadingTaxonomy || !interests.length || !trackOptions.length}
            >
              {loading ? "Creating account..." : "Create account"}
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
