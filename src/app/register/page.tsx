"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    await register(form.username, form.email);
    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary via-primary-glow to-accent p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-bold">MooreSkillUp</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Skills compound. Show up daily, ship steadily.
          </h2>
          <p className="mt-4 max-w-sm text-white/85">
            Structured modules, focused lessons, and the dashboard you will
            actually want to open tomorrow.
          </p>
        </div>
        <div className="text-sm text-white/70">© MooreSkillUp Academy</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">MooreSkillUp</span>
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start learning in under a minute.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input
              label="Username"
              name="username"
              required
              value={form.username}
              onChange={setField("username")}
              placeholder="alex.moore"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={setField("email")}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={setField("password")}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm password"
              name="confirm"
              type="password"
              required
              value={form.confirm}
              onChange={setField("confirm")}
              placeholder="Repeat password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
