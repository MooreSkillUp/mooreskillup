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
  ScrollText,
  StickyNote,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { getVideoRenderMode } from "@/lib/video";
import {
  getLessonNote,
  saveLessonNote,
  saveLessonProgress,
  usePlayer,
} from "@/lib/student";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const { notifySuccess, notifyError } = useFeedback();
  const { data, isLoading, error, refresh } = usePlayer(lessonId);

  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load this lesson's note when the student can access it.
  useEffect(() => {
    if (!data?.canAccess || !data.isEnrolled) return;
    let active = true;
    getLessonNote(lessonId)
      .then((res) => {
        if (active) setNote(res?.content ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [lessonId, data?.canAccess, data?.isEnrolled]);

  // Record a "started" ping + resume video position.
  useEffect(() => {
    if (!data?.isEnrolled || !data.canAccess) return;
    if (data.progress.status === "not_started") {
      void saveLessonProgress(lessonId, { status: "in_progress" });
    }
    const pos = data.progress.lastPositionSeconds;
    if (pos > 0 && videoRef.current) {
      videoRef.current.currentTime = pos;
    }
  }, [lessonId, data?.isEnrolled, data?.canAccess]);

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

  const saveNote = async () => {
    try {
      setNoteSaving(true);
      await saveLessonNote(lessonId, note);
      notifySuccess("Note saved");
    } catch (e) {
      notifyError("Couldn't save note", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setNoteSaving(false);
    }
  };

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
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* Main */}
        <div className="space-y-5">
          <div>
            <Link href={`/course/${course.id}`} className="text-sm text-muted-foreground hover:text-foreground">
              ← {course.title}
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold">{lesson.title || "Untitled lesson"}</h1>
            <p className="text-sm text-muted-foreground">{lesson.sectionTitle}</p>
          </div>

          {/* Content */}
          {lesson.type === "video" ? (
            lesson.embedUrl && getVideoRenderMode(lesson.videoUrl) === "iframe" ? (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
                <iframe
                  src={lesson.embedUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : lesson.videoUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
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
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                No video added to this lesson yet.
              </div>
            )
          ) : lesson.type === "resource" ? (
            <div className="rounded-2xl border border-border bg-card p-6">
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
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/40"
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
              className="prose prose-sm max-w-none rounded-2xl border border-border bg-card p-6 text-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: lesson.textContent || "<p>No content yet.</p>" }}
            />
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
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

          {/* Assignments & projects */}
          {sectionItems.assignments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
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
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
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

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-semibold">
              <StickyNote className="h-4 w-4 text-primary" /> My notes
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write notes for this lesson — only you can see them."
              className="mt-3 min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none"
              style={{ direction: "ltr" }}
            />
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void saveNote()} loading={noteSaving} loadingText="Saving...">
              Save note
            </Button>
          </div>
        </div>

        {/* Curriculum sidebar */}
        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-display text-lg font-bold">Course content</h3>
            <div className="mt-3 space-y-3">
              {curriculum.map((section, index) => (
                <div key={section.id}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {index + 1}. {section.title}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {section.lessons.map((l) => {
                      const active = l.id === lessonId;
                      return (
                        <Link
                          key={l.id}
                          href={l.locked ? "#" : `/lesson/${l.id}`}
                          onClick={(e) => l.locked && e.preventDefault()}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                            active ? "bg-primary/10 font-medium text-primary" : l.locked ? "text-muted-foreground/60" : "hover:bg-muted"
                          }`}
                        >
                          {l.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : l.locked ? (
                            <Lock className="h-3.5 w-3.5 shrink-0" />
                          ) : l.type === "video" ? (
                            <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ScrollText className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="line-clamp-1">{l.title || "Untitled"}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
