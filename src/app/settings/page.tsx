"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { Button } from "../../components/ui-kit/Button";
import { Input } from "../../components/ui-kit/Input";
import { useAuth } from "../../lib/auth";
import { interests, pricingPlans, type Interest, type UserPlan } from "../../lib/mock-data";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    plan: user?.plan ?? "free",
  });
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(
    user?.interests ?? ["Frontend"],
  );
  const [saved, setSaved] = useState(false);

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const onProfile = (event: React.FormEvent) => {
    event.preventDefault();
    updateUser({
      username: form.username,
      email: form.email,
      displayName: form.username,
      plan: form.plan as UserPlan,
      interests: selectedInterests,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your plan, interests, and personalized dashboard preferences.
          </p>
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Profile and preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your identity and the interests used to personalize your learning path.
          </p>

          <form onSubmit={onProfile} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>

            <div>
              <div className="text-sm font-medium text-foreground">Current plan</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pricingPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setForm({ ...form, plan: plan.id })}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      form.plan === plan.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {plan.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-foreground">Interests</div>
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

            <div className="flex items-center gap-3">
              <Button type="submit" variant="accent">
                <Save className="h-4 w-4" /> Save changes
              </Button>
              {saved && <span className="text-sm text-success">Saved.</span>}
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
