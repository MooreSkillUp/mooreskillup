"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderGit2,
  Lock,
  PlayCircle,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { getVideoRenderMode } from "@/lib/video";
import { CurriculumSidebar } from "@/components/course/CurriculumSidebar";
import { saveLessonProgress, usePlayer } from "@/lib/student";

/**
 * How often an open lesson tells the server it is still being studied.
 *
 * Comfortably under the server's per-ping cap (120s) so an honest student's
 * time is credited in full, while still being infrequent enough that a long
 * lesson costs only a handful of requests.
 */
const HEARTBEAT_MS = 60_000;

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const { notifySuccess, notifyError } = useFeedback();
  const { data, isLoading, error, refresh } = usePlayer(lessonId);

  const [completing, setCompleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Record a "started" ping + resume video position.
  const progressStatus = data?.progress.status;
  const lastPositionSeconds = data?.progress.lastPositionSeconds ?? 0;
  useEffect(() => {
    if (!data?.isEnrolled || !data.canAccess) return;
    if (progressStatus === "not_started") {
      void saveLessonProgress(lessonId, { status: "in_progress" });
    }
    if (lastPositionSeconds > 0 && videoRef.current) {
      videoRef.current.currentTime = lastPositionSeconds;
    }
  }, [lessonId, data?.isEnrolled, data?.canAccess, progressStatus, lastPositionSeconds]);

  /**
   * Heartbeat, so learning time is actually measured.
   *
   * The server banks the gap between consecutive pings, capped per ping. Before
   * this, the only pings were "lesson opened", "video paused" and "marked
   * complete" — so half an hour spent reading a text lesson produced two pings
   * and banked a couple of minutes. This keeps the clock honest.
   *
   * It stops while the tab is hidden: a lesson left open in a background tab is
   * not study, and the server-side cap alone would still let it drip time.
   */
  const canRecordTime = Boolean(data?.isEnrolled && data?.canAccess);
  useEffect(() => {
    if (!canRecordTime) return;

    const beat = () => {
      if (document.visibilityState !== "visible") return;
      void saveLessonProgress(lessonId, { status: "in_progress" });
    };

    const timer = window.setInterval(beat, HEARTBEAT_MS);
    // Bank the stretch just spent away before the tab went quiet.
    document.addEventListener("visibilitychange", beat);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [canRecordTime, lessonId]);

  if (isLoading) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="h-[70vh] animate-pulse rounded-[2rem] bg-muted/40" />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Lesson unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error || "Try again later."}</p>
          <Link href="/dashboard/courses" className="mt-4 inline-block font-semibold text-primary">
            Back to courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const { lesson, course, canAccess, isEnrolled, sectionItems, curriculum, prevLessonId, nextLessonId } = data;
  const lessonTypeLabel =
    lesson.type === "video" ? "Video lesson" : lesson.type === "resource" ? "Resource lesson" : "Reading lesson";

  // Progress within the section being watched, rather than across the course.
  const currentSection = curriculum.find((section) =>
    section.lessons.some((item) => item.id === lessonId),
  );
  const sectionTotal = currentSection?.lessons.length ?? 0;
  const sectionDone = currentSection?.lessons.filter((item) => item.completed).length ?? 0;
  const sectionPercent = sectionTotal ? Math.round((sectionDone / sectionTotal) * 100) : 0;

  // "Lesson 4 of 23" — position in the whole course, which the header shows.
  const flatLessons = curriculum.flatMap((section) => section.lessons);
  const lessonNumber = flatLessons.findIndex((item) => item.id === lessonId) + 1;

  const markComplete = async () => {
    try {
      setCompleting(true);
      const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
      await saveLessonProgress(lessonId, { status: "completed", position_seconds: pos });
      notifySuccess("Lesson completed");
      if (nextLessonId) {
        router.push(`/lesson/${nextLessonId}`);
      } else {
        notifySuccess("Course finished!", "Check your certificates if this course offers one.");
        await refresh();
      }
    } catch (e) {
      notifyError("Couldn't update progress", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setCompleting(false);
    }
  };

  const saveVideoPosition = () => {
    if (!isEnrolled || !videoRef.current) return;
    void saveLessonProgress(lessonId, { position_seconds: Math.floor(videoRef.current.currentTime) });
  };

  if (!canAccess) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-20 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">This lesson is locked</h1>
          <p className="mt-2 text-muted-foreground">Enroll in the course to unlock this lesson.</p>
          <Link href={`/course/${course.id}`} className="mt-4 inline-block font-semibold text-primary">
            Go to course page
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        {/* Header. The lesson title leads and the course sits above it as a
            breadcrumb — inside the player the lesson is the subject, and the
            course is context you already chose. */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/course/${course.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {course.title}
              </Link>

              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {lessonNumber > 0 ? `Lesson ${lessonNumber} of ${flatLessons.length}` : lessonTypeLabel}
              </p>
              <h1 className="mt-1 font-display text-xl font-bold leading-tight sm:text-2xl">
                {lesson.title || "Untitled lesson"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{lesson.sectionTitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevLessonId}
                onClick={() => prevLessonId && router.push(`/lesson/${prevLessonId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextLessonId}
                onClick={() => nextLessonId && router.push(`/lesson/${nextLessonId}`)}
              >
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
              <div className="p-5">
                {lesson.type === "video" ? (
                  lesson.embedUrl && getVideoRenderMode(lesson.videoUrl) === "iframe" ? (
                    <div className="aspect-video w-full overflow-hidden rounded-[1.5rem] border border-border bg-black">
                      <iframe
                        src={lesson.embedUrl}
                        title={lesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  ) : lesson.videoUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-[1.5rem] border border-border bg-black">
                      <video
                        ref={videoRef}
                        src={lesson.videoUrl}
                        controls
                        controlsList="nodownload"
                        onPause={saveVideoPosition}
                        onEnded={saveVideoPosition}
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-border p-8 text-center text-muted-foreground">
                      No video added to this lesson yet.
                    </div>
                  )
                ) : lesson.type === "resource" ? (
                  <div className="rounded-[1.5rem] border border-border bg-background p-6">
                    <h3 className="font-display text-lg font-bold">Resources</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lesson.resourceLinks.filter((l) => l.url).length ? (
                        lesson.resourceLinks
                          .filter((l) => l.url)
                          .map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                              {link.title || link.type}
                            </a>
                          ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No resources added.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none rounded-[1.5rem] border border-border bg-background p-6 text-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: lesson.textContent || "<p>No content yet.</p>" }}
                  />
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-xl font-bold">Continue learning</div>
                  <div className="text-sm text-muted-foreground">Save your place and move through the course smoothly.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!prevLessonId} onClick={() => prevLessonId && router.push(`/lesson/${prevLessonId}`)}>
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button variant="accent" onClick={() => void markComplete()} loading={completing} loadingText="Saving...">
                    <CheckCircle2 className="h-4 w-4" />
                    {nextLessonId ? "Complete & continue" : "Mark complete"}
                  </Button>
                  <Button variant="outline" disabled={!nextLessonId} onClick={() => nextLessonId && router.push(`/lesson/${nextLessonId}`)}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {sectionItems.assignments.map((a) => (
              <div key={a.id} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Assignment: {a.title}
                </div>
                <div className="prose prose-sm mt-2 max-w-none text-muted-foreground dark:prose-invert" dangerouslySetInnerHTML={{ __html: a.instructions }} />
                {a.dueDate && <div className="mt-2 text-xs text-muted-foreground">Due {new Date(a.dueDate).toLocaleDateString("en-NG")}</div>}
                {a.submissionUrl && (
                  <a href={a.submissionUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      {a.submissionType === "whatsapp_group" ? "Join submission group" : "Submit assignment"}
                    </Button>
                  </a>
                )}
                {a.howToSubmit && <p className="mt-2 text-xs text-muted-foreground">{a.howToSubmit}</p>}
              </div>
            ))}
            {sectionItems.projects.map((p) => (
              <div key={p.id} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <FolderGit2 className="h-4 w-4 text-primary" /> Project: {p.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                {p.requirements && <p className="mt-2 text-sm"><strong>Requirements:</strong> {p.requirements}</p>}
                {p.deliverables && <p className="mt-1 text-sm"><strong>Deliverables:</strong> {p.deliverables}</p>}
                {p.submissionUrl && (
                  <a href={p.submissionUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">Submit project</Button>
                  </a>
                )}
              </div>
            ))}

          </div>

          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <CurriculumSidebar
              sections={curriculum.map((section) => ({
                id: section.id,
                title: section.title,
                isLocked: section.isLocked,
                taskCount: section.taskCount,
                lessons: section.lessons.map((item) => ({
                  id: item.id,
                  title: item.title,
                  type: item.type,
                  locked: item.locked,
                  completed: item.completed,
                  durationMinutes: item.durationMinutes,
                })),
              }))}
              currentLessonId={lessonId}
              courseId={course.id}
            />

            {/* Where this section stands, separate from the course as a whole —
                the nearer milestone is the one that pulls a student forward. */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-base font-semibold">This section</h2>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${sectionPercent}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="font-display text-lg font-bold tabular-nums">
                    {sectionDone}/{sectionTotal}
                  </div>
                  <div className="text-xs text-muted-foreground">Lessons done</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold tabular-nums">{sectionPercent}%</div>
                  <div className="text-xs text-muted-foreground">Section progress</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
