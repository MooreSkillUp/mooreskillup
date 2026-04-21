"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { teacherProfileOptions, teacherUploads, trackOptionsByInterest, type TrackName } from "@/lib/mock-data";

export default function TeacherSettingsPage() {
  const defaultProfile = teacherProfileOptions[1] ?? teacherProfileOptions[0];
  const [track, setTrack] = useState<TrackName>(defaultProfile.track);
  const trackOptions = trackOptionsByInterest[defaultProfile.program];

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Teacher settings
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Configure your teaching profile</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Keep your public profile aligned with the program you teach and the track your courses
            belong to.
          </p>
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Display name" defaultValue={defaultProfile.name} />
                <Input label="Public email" defaultValue={defaultProfile.email} />
              </div>
              <div className="rounded-3xl border border-border bg-muted/30 p-5">
                <div className="text-sm font-medium text-foreground">Primary program</div>
                <div className="mt-2 font-display text-2xl font-bold">{defaultProfile.program}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Locked after teacher registration to keep course ownership and backend relations
                  consistent.
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Track specialization</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {trackOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTrack(item)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        item === track
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border bg-background hover:border-primary/30"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{item}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Learners will see this as your teaching specialization.
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teacher bio</label>
                <Textarea
                  defaultValue={defaultProfile.bio}
                  className="min-h-32 bg-background"
                />
              </div>
              <Button variant="accent">
                <Save className="h-4 w-4" /> Save teacher settings
              </Button>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-background p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Upload defaults
              </div>
              <div className="mt-4 font-display text-2xl font-bold">{track}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                New uploads inherit your locked program and current track so course creation stays
                aligned with tutor ownership.
              </div>
              <div className="mt-5 space-y-3">
                {teacherUploads.map((upload) => (
                  <div key={upload.id} className="rounded-2xl border border-border p-4">
                    <div className="font-medium">{upload.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {upload.program} • {upload.track}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
