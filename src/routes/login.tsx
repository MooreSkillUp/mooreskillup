import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email || "alex.moore@mooreskillup.com");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your learning journey.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email or username"
          name="email"
          type="text"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary via-primary-glow to-accent p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
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
            Structured modules, focused lessons, and the dashboard you'll actually want to open
            tomorrow.
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
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">MooreSkillUp</span>
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
