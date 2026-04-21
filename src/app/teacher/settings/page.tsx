"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { teacherProfileOptions, teacherUploads, trackOptionsByInterest, type Interest, type TrackName } from "@/lib/mock-data";

export default function TeacherSettingsPage() {
  const defaultProfile = teacherProfileOptions[0];
  const [program, setProgram] = useState<Interest>(defaultProfile.program);
  const [track, setTrack] = useState<TrackName>(defaultProfile.track);
  const trackOptions = trackOptionsByInterest[program];

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Teacher settings
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Configure your teaching profile</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Define what you teach, how your profile appears to learners, and the defaults used in
            your course upload workflow.
          </p>
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Teacher name" defaultValue={defaultProfile.name} />
                <Input label="Public email" defaultValue="teacher@mooreskillup.com" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Primary program</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.keys(trackOptionsByInterest).map((item) => {
                    const interest = item as Interest;
                    const active = interest === program;
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          setProgram(interest);
                          setTrack(trackOptionsByInterest[interest][0]);
                        }}
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
                        Learners will see this as your teaching focus.
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teacher bio</label>
                <Textarea
                  defaultValue={`${defaultProfile.focus}. I guide learners from roadmap to project delivery with weekly assessments and clear review checkpoints.`}
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
                New uploads will start from this program and track unless you change them per
                course.
              </div>
              <div className="mt-5 space-y-3">
                {teacherUploads.map((upload) => (
                  <div key={upload.id} className="rounded-2xl border border-border p-4">
                    <div className="font-medium">{upload.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {upload.program} · {upload.track}
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
