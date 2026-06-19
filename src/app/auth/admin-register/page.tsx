"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Shield, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function AdminRegisterPage() {
  const { register } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    adminRegistrationToken: "",
  });
  const [loading, setLoading] = useState(false);

  const setField =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirm) {
      const message = "Passwords do not match.";
      notifyError("Password mismatch", message);
      return;
    }
    setLoading(true);
    try {
      const nextUser = await register({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.username,
        interests: ["Backend Development"],
        selectedInterest: "Backend Development",
        selectedTrack: "Backend with Python",
        role: "admin",
        plan: "premium",
        adminRegistrationToken: form.adminRegistrationToken,
      });
      notifySuccess("Admin account created", "Redirecting to the admin dashboard.");
      router.push(getHomeRouteForUser(nextUser));
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to create admin account.";
      notifyError("Admin registration failed", message);
    } finally {
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
            Admin route
          </div>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-bold leading-tight">
            Provision admin access with a dedicated frontend route.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Use the backend bootstrap token to create the first admin account safely,
            then manage the platform from the real admin dashboard.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-5 text-sm text-muted-foreground">
          Admin accounts land on admin dashboard.
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
            <BrandLogo href="/" />
            </Link>
            <ThemeToggle />
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Create admin account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This route is for secure backend bootstrap and admin access setup.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input label="Username" value={form.username} onChange={setField("username")} required />
            <Input label="Email" type="email" value={form.email} onChange={setField("email")} required />
            <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={setField("password")} required />
            <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={setField("confirm")} required />
            <PasswordInput
              label="Admin setup token"
              autoComplete="one-time-code"
              value={form.adminRegistrationToken}
              onChange={setField("adminRegistrationToken")}
              required
            />
            <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} loadingText="Creating admin...">
              <UserPlus className="h-4 w-4" />
              Create admin account
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
