import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { AuthLayout } from "./login";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    await register(form.username, form.email);
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start learning in under a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Username" name="username" required value={form.username} onChange={set("username")} placeholder="alex.moore" />
        <Input label="Email" name="email" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
        <Input label="Password" name="password" type="password" required value={form.password} onChange={set("password")} placeholder="At least 6 characters" />
        <Input label="Confirm password" name="confirm" type="password" required value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
