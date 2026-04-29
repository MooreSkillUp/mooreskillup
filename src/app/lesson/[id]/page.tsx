"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ListChecks, Lock } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { formatNaira } from "@/lib/commerce";
import { getEmbeddedVideoUrl, getVideoRenderMode } from "@/lib/video";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const {
    findStudentLesson,
    getStudentCourseSections,
    isCourseOwnedByStudent,
    recordLessonAccess,
    markLessonComplete,
  } = useTeacherWorkspace();
  const [notes, setNotes] = useState("");
  const found = findStudentLesson(lessonId);

  useEffect(() => {
    if (found) {
      recordLessonAccess(found.course.id, lessonId);
    }
  }, [found, lessonId, recordLessonAccess]);

  const courseSections = useMemo(
    () => (found ? getStudentCourseSections(found.course.id) : []),
    [found, getStudentCourseSections],
  );

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

  const { lesson, course, section, sectionIndex, lessonIndex } = found;
  const sectionView = courseSections[sectionIndex];
  const lessonView = sectionView?.lessons[lessonIndex];
  const owned = isCourseOwnedByStudent(course.id);
  const accessible = lessonView && lessonView.status !== "locked";
  const flatLessons = courseSections.flatMap((item) =>
    item.lessons.filter((lessonItem) => lessonItem.status !== "locked"),
  );
  const currentFlatIndex = flatLessons.findIndex((item) => item.id === lesson.id);
  const previous = currentFlatIndex > 0 ? flatLessons[currentFlatIndex - 1] : null;
  const next =
    currentFlatIndex >= 0 && currentFlatIndex < flatLessons.length - 1
      ? flatLessons[currentFlatIndex + 1]
      : null;
  const sectionTask = sectionView?.tasks[0];

  if (!accessible) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold">This lesson is locked</h1>
          <p className="mt-3 text-muted-foreground">
            Pay once to unlock the full course and access every section, lesson, and task.
          </p>
          <div className="mt-4 text-sm font-medium text-foreground">
            Full Course Access: {formatNaira(course.price)}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/course/${course.id}`}>
              <Button variant="outline">Back to course</Button>
            </Link>
            {!owned && (
              <Link href={`/payment/${course.id}`}>
                <Button variant="accent">Unlock Full Course</Button>
              </Link>
            )}
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
            Section · {section.title}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            {lesson.contentType === "video"
              ? "Watch the lesson video, then complete the section task."
              : "Read through the lesson text, then continue to the section task."}
          </p>
        </section>

        {lesson.contentType === "video" ? (
          <div className="overflow-hidden rounded-[2rem] border border-border bg-black shadow-sm">
            {getVideoRenderMode(lesson.videoUrl) === "native" ? (
              <div className="aspect-video w-full">
                <video
                  src={lesson.videoUrl}
                  controls
                  controlsList="nodownload"
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="aspect-video w-full">
                <iframe
                  src={getEmbeddedVideoUrl(lesson.videoUrl)}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div
              className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: lesson.textContent || "<p>No text content yet.</p>" }}
            />
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Temporary notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write down key ideas, action items, or reminders from this lesson..."
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
                <div className="text-muted-foreground">{sectionTask.instructions}</div>
                <div className="text-muted-foreground">{sectionTask.submissionGuide}</div>
                <a
                  href={sectionTask.watchGuideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex font-semibold text-primary"
                >
                  Watch Section Guide
                </a>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={sectionTask.sectionChannelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary"
                  >
                    Open Section Channel
                  </a>
                  <a
                    href={sectionTask.submissionChannelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary"
                  >
                    Open Submission Channel
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No task is attached to this section yet.</div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">
            {lessonView?.status === "completed"
              ? "This lesson is already marked complete."
              : "Finished? Mark it complete to keep your progress updated."}
          </div>
          <Button
            variant={lessonView?.status === "completed" ? "outline" : "accent"}
            onClick={() => markLessonComplete(course.id, lesson.id)}
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {previous ? (
            <Link href={`/lesson/${previous.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> Previous Lesson
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <ArrowLeft className="h-4 w-4" /> Previous Lesson
            </Button>
          )}

          {next ? (
            <Link href={`/lesson/${next.id}`}>
              <Button variant="accent">
                Next Lesson <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Next Lesson <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
