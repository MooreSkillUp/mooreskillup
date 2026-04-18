import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ArrowLeft, FileText, ListChecks } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { findLesson } from "@/lib/mock-data";

export const Route = createFileRoute("/lesson/$id")({
  loader: ({ params }) => {
    const found = findLesson(params.id);
    if (!found) throw notFound();
    return found;
  },
  component: LessonPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Lesson not found</h1>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">Back to dashboard</Button>
        </Link>
      </div>
    </AppShell>
  ),
});

function LessonPage() {
  const { lesson, course, module } = Route.useLoaderData();
  const [completed, setCompleted] = useState(lesson.status === "completed");
  const [notes, setNotes] = useState("");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/course/$id"
          params={{ id: course.id }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {course.title}
        </Link>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            Week {module.week} · {module.title}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
          <p className="mt-2 text-muted-foreground">{lesson.description}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-black shadow-sm">
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

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down what stood out from this lesson…"
              className="h-40 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-semibold">Task</h2>
            </div>
            <ol className="space-y-2.5 text-sm text-foreground">
              <li className="flex gap-2"><span className="font-semibold text-accent">1.</span> Watch the lesson video end to end.</li>
              <li className="flex gap-2"><span className="font-semibold text-accent">2.</span> Recreate the example shown in your own editor.</li>
              <li className="flex gap-2"><span className="font-semibold text-accent">3.</span> Write a 2-line summary in the notes panel.</li>
              <li className="flex gap-2"><span className="font-semibold text-accent">4.</span> Mark the lesson as complete.</li>
            </ol>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">
            {completed ? "Great work — this lesson is complete." : "Finished? Mark it done to unlock the next one."}
          </div>
          <Button
            variant={completed ? "outline" : "accent"}
            onClick={() => setCompleted((c) => !c)}
          >
            {completed ? <><CheckCircle2 className="h-4 w-4" /> Completed</> : "Mark as complete"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
