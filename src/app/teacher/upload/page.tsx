"use client";

import { useState } from "react";
import { FileText, Link2, PlusCircle, Save, Video } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { teacherUploads, trackOptionsByInterest, type Interest, type TrackName } from "@/lib/mock-data";

const initialModules = [
  {
    id: "section-1",
    title: "Section 1 - Foundations",
    isFree: true,
    assessment: "Section task and weekly project",
    project: "Build and submit the first guided task",
    lessons: [
      { id: "lesson-1", title: "Introduction lesson", format: "video", resource: "https://youtube.com/watch?v=lesson-1" },
      { id: "lesson-2", title: "Reference notes", format: "text", resource: "Explain the topic, examples, and learner checklist." },
    ],
  },
];

export default function TeacherUploadPage() {
  const [program, setProgram] = useState<Interest>("Backend Development");
  const [track, setTrack] = useState<TrackName>("Backend with Python");
  const [modules, setModules] = useState(initialModules);
  const trackOptions = trackOptionsByInterest[program];

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Teacher upload
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold">
                Build a course the same way learners will study it
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Structure each course from category and track down to roadmap, sections, lessons,
                and tasks with clear submission instructions.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">Preview learner view</Button>
              <Button variant="accent">
                <Save className="h-4 w-4" /> Save draft
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Course title" placeholder="Python Programming Language" />
              <Input label="Course subtitle" placeholder="Backend foundations with Python" />
            </div>

            <div>
              <div className="text-sm font-medium text-foreground">Program</div>
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
              <div className="text-sm font-medium text-foreground">Track</div>
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
                      The upload, roadmap, and learner assignment will sit inside this track.
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Course tags" placeholder="python, backend, api, django" />
              <Input label="Roadmap link" placeholder="https://example.com/python-roadmap" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Course overview</label>
              <Textarea
                className="min-h-28 bg-background"
                placeholder="Explain what the learner will achieve, how the course is structured, and what they unlock after paying for the full course."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Scheme of work / roadmap</label>
              <Textarea
                className="min-h-28 bg-background"
                placeholder="Break down the roadmap by learning phases, tools, and expected weekly outcomes."
              />
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-2xl font-bold">Sections, lessons, and tasks</div>
                  <div className="text-sm text-muted-foreground">
                    Add as many sections as the course requires. Mark the beginner section as free if needed.
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setModules((current) => [
                      ...current,
                      {
                        id: `section-${current.length + 1}`,
                        title: `Section ${current.length + 1} - New section`,
                        isFree: false,
                        assessment: `Section ${current.length + 1} task`,
                        project: "Define the task submission instructions",
                        lessons: [
                          {
                            id: `lesson-${current.length + 1}-1`,
                            title: "New lesson",
                            format: "video",
                            resource: "https://youtube.com/watch?v=new-lesson",
                          },
                        ],
                      },
                    ])
                  }
                >
                  <PlusCircle className="h-4 w-4" /> Add section
                </Button>
              </div>

              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div key={module.id} className="rounded-3xl border border-border bg-card p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Section title" defaultValue={module.title} />
                      <Input label="Task title" defaultValue={module.assessment} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant={module.isFree ? "accent" : "outline"} size="sm" type="button">
                        {module.isFree ? "Free section" : "Paid section"}
                      </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <label className="text-sm font-medium text-foreground">Task submission instructions</label>
                      <Textarea className="min-h-24 bg-background" defaultValue={module.project} />
                    </div>
                    <div className="mt-4 space-y-3">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="rounded-2xl border border-border bg-background p-4">
                          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                            <Input label={`Lesson ${lessonIndex + 1} title`} defaultValue={lesson.title} />
                            <Input label="Format" defaultValue={lesson.format} />
                          </div>
                          <Input
                            className="mt-4"
                            label={lesson.format === "video" ? "Video link" : "Text content / resource"}
                            defaultValue={lesson.resource}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Section {index + 1} can be free or paid, and each section should include its
                      own lesson flow plus one clear task.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Upload guidance
              </div>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  1. Define the course title, subtitle, program, and track before adding lessons.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  2. Add a roadmap or scheme of work so learners know the prerequisite path.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  3. Build the course section by section. The first section can be free while the rest stay locked until payment.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  4. Each section should have lessons and one task with proper submission instructions.
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-2xl font-bold">Learner preview logic</div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Link2 className="h-4 w-4 text-primary" />
                    Roadmap
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Learners see roadmap and prerequisites before the first section starts.
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Video className="h-4 w-4 text-primary" />
                    Lesson resources
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Each lesson can carry either a video link or text-based content reference.
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Section tasks
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Every section ends with a task and a clear submission expectation.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-2xl font-bold">Current uploads</div>
              <div className="mt-4 space-y-3">
                {teacherUploads.map((upload) => (
                  <div key={upload.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{upload.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {upload.program} · {upload.track} · {upload.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {upload.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
