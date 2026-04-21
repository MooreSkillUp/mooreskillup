"use client";

import { useState } from "react";
import { ImagePlus, Save } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { Button } from "../../components/ui-kit/Button";
import { Input } from "../../components/ui-kit/Input";
import { toDisplayName, useAuth } from "../../lib/auth";
import {
  interests,
  pricingPlans,
  trackOptionsByInterest,
  type Interest,
  type TrackName,
  type UserPlan,
} from "../../lib/mock-data";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const initialInterest = user?.selectedInterest ?? "Backend Development";
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    plan: user?.plan ?? "free",
    avatarUrl: user?.avatarUrl ?? "",
  });
  const [selectedInterest, setSelectedInterest] = useState<Interest>(initialInterest);
  const [selectedTrack, setSelectedTrack] = useState<TrackName>(
    user?.selectedTrack ?? trackOptionsByInterest[initialInterest][0],
  );
  const [saved, setSaved] = useState(false);
  const trackOptions = trackOptionsByInterest[selectedInterest];

  const chooseInterest = (interest: Interest) => {
    setSelectedInterest(interest);
    setSelectedTrack(trackOptionsByInterest[interest][0]);
  };

  const onProfile = (event: React.FormEvent) => {
    event.preventDefault();
    updateUser({
      username: form.username,
      email: form.email,
      displayName: toDisplayName(form.username),
      plan: form.plan as UserPlan,
      avatarUrl: form.avatarUrl || undefined,
      interests: [selectedInterest],
      selectedInterest,
      selectedTrack,
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
            <Input
              label="Profile image URL"
              value={form.avatarUrl}
              placeholder="https://example.com/avatar.jpg"
              onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })}
            />

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
              <div className="text-sm font-medium text-foreground">Main academy path</div>
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
                <ImagePlus className="h-4 w-4 text-primary" />
                Preferred track
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                        This is the track the dashboard will prioritize first.
                      </div>
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
