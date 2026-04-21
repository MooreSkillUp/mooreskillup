"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ListChecks, Lock } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import {
  canAccessLessonInCourse,
  findLesson,
  getCourseSections,
  getLessonNavigation,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export default function LessonPage() {
  const params = useParams();
  const { user } = useAuth();
  const lessonId = params.id as string;
  const found = findLesson(lessonId);
  const [completed, setCompleted] = useState(found?.lesson.status === "completed");
  const [notes, setNotes] = useState("");

  if (!found) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Lesson not found</h1>
          <Link href="/dashboard/courses">
            <Button variant="outline" className="mt-4">
              Back to courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { lesson, course, module } = found;
  const sections = getCourseSections(course, user);
  const currentSection = sections.find((section) => section.id === module.id);
  const accessible = canAccessLessonInCourse(course, lesson.id, user);
  const navigation = getLessonNavigation(course, lesson.id, user);
  const sectionTask = currentSection?.tasks[0];

  if (!accessible) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold">This lesson is locked</h1>
          <p className="mt-3 text-muted-foreground">
            Free learners can only access the open sections in this course. Unlock the full course
            to continue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/course/${course.id}`}>
              <Button variant="outline">Back to course</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="accent">Unlock Full Course</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/course/${course.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {course.title}
        </Link>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Section · {currentSection?.title ?? module.title}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">{lesson.description}</p>
        </section>

        <div className="overflow-hidden rounded-[2rem] border border-border bg-black shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${lesson.videoId}`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Temporary notes</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              These notes stay only while you are here. They are not stored yet.
            </p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write down key ideas, code tips, or reminders from this lesson..."
              className="h-48 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-semibold">Section task</h2>
            </div>
            {sectionTask ? (
              <div className="space-y-3 text-sm">
                <div className="font-medium text-foreground">{sectionTask.title}</div>
                <div className="text-muted-foreground">{sectionTask.description}</div>
                <div className="text-muted-foreground">{sectionTask.submissionInstructions}</div>
                {sectionTask.helpVideoLink && (
                  <a
                    href={sectionTask.helpVideoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex font-semibold text-primary"
                  >
                    Watch submission guide
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No task is attached to this section yet.
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">
            {completed
              ? "Great work. This lesson is marked complete for the current session."
              : "Finished? Mark it done and move to the next lesson."}
          </div>
          <Button
            variant={completed ? "outline" : "accent"}
            onClick={() => setCompleted((current) => !current)}
          >
            {completed ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Completed
              </>
            ) : (
              "Mark as complete"
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {navigation.previous ? (
            <Link href={`/lesson/${navigation.previous.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
          )}

          {navigation.next ? (
            <Link href={`/lesson/${navigation.next.id}`}>
              <Button variant="accent">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
