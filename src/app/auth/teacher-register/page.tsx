"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Upload } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { interests, trackOptionsByInterest, type Interest, type TrackName } from "@/lib/mock-data";

export default function TeacherRegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    teachingFocus: "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>("Web Development");
  const [selectedTrack, setSelectedTrack] = useState<TrackName>("React and Modern UI");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const trackOptions = trackOptionsByInterest[selectedInterest];

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
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const nextUser = await register({
      username: form.username,
      email: form.email,
      interests: [selectedInterest],
      selectedInterest,
      selectedTrack,
      role: "teacher",
      plan: "premium",
    });
    router.push(getHomeRouteForUser(nextUser));
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.22),transparent_24%)] p-10 text-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between">
          <BrandLogo href="/" subtitle="Teacher onboarding" />
          <ThemeToggle />
        </div>

        <div>
          <div className="inline-flex rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Admin provisioning route
          </div>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-bold leading-tight">
            Create teacher access for course uploads and tutor workspace ownership.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            This frontend route represents the admin-only teacher creation flow before backend
            permissions are connected.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-5 text-sm text-muted-foreground">
          Teacher accounts should be mapped to a program and a track so uploads, settings, and
          learner-facing ownership stay consistent later in backend permissions.
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-[2rem] border border-border bg-card p-8 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <BrandLogo href="/" size="sm" subtitle="Teacher onboarding" />
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Create teacher account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this as the admin-facing onboarding form for new teachers.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Username" value={form.username} onChange={setField("username")} required />
              <Input label="Email" type="email" value={form.email} onChange={setField("email")} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Password" type="password" value={form.password} onChange={setField("password")} required />
              <Input label="Confirm password" type="password" value={form.confirm} onChange={setField("confirm")} required />
            </div>
            <Input
              label="Teaching focus"
              value={form.teachingFocus}
              onChange={setField("teachingFocus")}
              placeholder="e.g. Python APIs, UI/UX critique, SolidWorks modeling"
              required
            />

            <div>
              <div className="text-sm font-medium text-foreground">Program you teach under</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const active = interest === selectedInterest;
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
                Choose your teaching track inside {selectedInterest}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {trackOptions.map((track) => {
                  const active = track === selectedTrack;
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
                        This becomes the teacher&apos;s specialization and default upload context.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
              <Upload className="h-4 w-4" />
              {loading ? "Creating teacher..." : "Create teacher account"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
