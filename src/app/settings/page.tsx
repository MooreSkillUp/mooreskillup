"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { Button } from "../../components/ui-kit/Button";
import { Input } from "../../components/ui-kit/Input";
import { useAuth } from "../../lib/auth";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  const onProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      username: form.username,
      email: form.email,
      displayName: form.username,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account preferences.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your username and email.
          </p>
          <form onSubmit={onProfile} className="mt-5 space-y-4">
            <Input
              label="Username"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" variant="accent">
                <Save className="h-4 w-4" /> Save changes
              </Button>
              {saved && <span className="text-sm text-success">Saved.</span>}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            UI only. Backend wiring comes later.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPw({ current: "", next: "", confirm: "" });
            }}
          >
            <Input
              label="Current password"
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
            <Input
              label="New password"
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
            <Input
              label="Confirm new password"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
            <Button type="submit" variant="primary">
              Update password
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
