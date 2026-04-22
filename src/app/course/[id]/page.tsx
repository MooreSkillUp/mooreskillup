"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Heart, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { formatNaira, getCourseActionLabel } from "@/lib/commerce";
import { useAuth } from "@/lib/auth";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function CoursePage() {
  const params = useParams();
  const { user, toggleWishlist } = useAuth();
  const {
    getCourseById,
    brandLabel,
    getStudentCourseProgress,
    getStudentCourseSections,
    isCourseOwnedByStudent,
    getContinueLearningLessonId,
    markLessonComplete,
  } = useTeacherWorkspace();
  const course = getCourseById(params.id as string);

  if (!course) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Course not found</h1>
          <Link href="/dashboard/courses">
            <Button variant="outline" className="mt-4">
              Back to courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const sections = getStudentCourseSections(course.id);
  const owned = isCourseOwnedByStudent(course.id);
  const progress = getStudentCourseProgress(course.id);
  const continueLessonId = getContinueLearningLessonId(course.id);
  const firstLessonId = sections[0]?.lessons[0]?.id;
  const inWatchlist = (user?.wishlist ?? []).includes(course.id);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-white shadow-lg sm:p-8">
          <BookOpen className="absolute right-6 top-6 h-20 w-20 text-white/15" />
          <div className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            {course.program} | {course.track}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Full Course Access
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                {course.price === 0 ? "₦0" : formatNaira(course.price)}
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Course Status
              </div>
              <div className="mt-1 font-semibold">
                {owned ? "Unlocked" : course.price === 0 ? "Free course" : "Preview mode"}
              </div>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm uppercase tracking-[0.2em] text-white/75">{brandLabel}</p>
          <p className="mt-3 max-w-2xl text-white/85">{course.subtitle}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {owned && continueLessonId ? (
              <Link href={`/lesson/${continueLessonId}`}>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Continue Learning
                </Button>
              </Link>
            ) : course.price === 0 && firstLessonId ? (
              <Link href={`/lesson/${firstLessonId}`}>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  {getCourseActionLabel(course.price, owned)}
                </Button>
              </Link>
            ) : (
              <Link href={course.price === 0 ? `/course/${course.id}` : `/payment/${course.id}`}>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  {getCourseActionLabel(course.price, owned)}
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => toggleWishlist(course.id)}
            >
              <Heart className={`h-4 w-4 ${inWatchlist ? "fill-current" : ""}`} />
              {inWatchlist ? "Saved to Watchlist" : "Add to Watchlist"}
            </Button>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              {progress}% completion
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Course Overview
              </div>
              <div
                className="prose prose-sm mt-4 max-w-none text-muted-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: course.overview || "<p>No overview yet.</p>" }}
              />
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                    Sections
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Course &gt; Sections &gt; Lessons &gt; Tasks
                  </h2>
                </div>
                {!owned && course.price > 0 && (
                  <Link href={`/payment/${course.id}`}>
                    <Button variant="accent">Unlock Course</Button>
                  </Link>
                )}
              </div>

              <div className="mt-6 space-y-5">
                {sections.map((section, index) => (
                  <div key={section.id} className="rounded-[1.5rem] border border-border bg-background p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                          Section {index + 1}
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold">{section.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                      </div>
                      <div className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {section.status}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.lessons.map((lesson) => (
                        <div key={lesson.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="font-medium">{lesson.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Type: {lesson.type === "video" ? "Video" : "Text"} | {lesson.status}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lesson.status === "locked" ? (
                              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                <Lock className="h-3.5 w-3.5" /> Locked
                              </div>
                            ) : (
                              <>
                                <Link href={`/lesson/${lesson.id}`}>
                                  <Button variant="outline" size="sm">
                                    {lesson.status === "in-progress" ? "Next Lesson" : "Start Lesson"}
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markLessonComplete(course.id, lesson.id)}
                                >
                                  Mark Complete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                        Section task
                      </div>
                      {section.tasks.map((task) => (
                        <div key={task.id} className="mt-3">
                          <div className="font-medium">{task.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{task.instructions}</div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <span className="font-semibold text-foreground">{task.submissionGuide}</span>
                            <a
                              href={task.watchGuideUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary"
                            >
                              Watch Section Guide
                            </a>
                            <a
                              href={task.sectionChannelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary"
                            >
                              Open Section Channel
                            </a>
                            <a
                              href={task.submissionChannelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary"
                            >
                              Open Submission Channel
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>

                    {section.isLocked && (
                      <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-900">
                        <div className="font-semibold">Locked</div>
                        <div className="mt-1">
                          Unlock Course to access this section and the rest of the learning flow.
                        </div>
                        <Link href={`/payment/${course.id}`} className="mt-3 inline-flex">
                          <Button size="sm" variant="accent">
                            Unlock Full Course
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold">Roadmap</h2>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                {course.schemeOfWork}
              </div>
              {course.roadmapLink && (
                <a
                  href={course.roadmapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-primary"
                >
                  Open roadmap
                </a>
              )}
            </section>

            {!owned && course.price > 0 && (
              <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display text-2xl font-bold">Unlock Full Course</h2>
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Full Course Access
                  </div>
                  <div className="mt-2 font-medium">{course.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Price: {formatNaira(course.price)}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Unlock all sections, lessons, tasks, and progress tracking in one payment.
                  </div>
                </div>
                <Link href={`/payment/${course.id}`} className="mt-4 block">
                  <Button variant="accent" className="w-full">
                    Proceed to Payment
                  </Button>
                </Link>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
