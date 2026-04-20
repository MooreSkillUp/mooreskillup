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

export default function AuthLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await login(email || "alex.pro@mooreskillup.com");
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
            ["4.2k+", "Learners"],
            ["12", "Active tracks"],
            ["1840", "Avg points"],
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">MooreSkillUp</span>
            </Link>
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your dashboard, interests, wishlist, and progress.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex.pro@mooreskillup.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

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
