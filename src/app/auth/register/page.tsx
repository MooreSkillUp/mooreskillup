"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { interests, type Interest } from "@/lib/mock-data";

export default function AuthRegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(["Frontend"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    await register({
      username: form.username,
      email: form.email,
      interests: selectedInterests,
    });
    router.push("/dashboard");
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
            Build an account that already knows what you want to learn next.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Pick your interests now and we will shape your dashboard around the
            tracks, tools, and courses that matter most to you.
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
            Start with your goals so your dashboard feels relevant from day one.
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
              <div className="text-sm font-medium text-foreground">Select your interests</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
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
