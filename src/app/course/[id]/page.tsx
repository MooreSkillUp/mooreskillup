"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { LessonCard } from "@/components/dashboard/LessonCard";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { useAuth } from "@/lib/auth";
import {
  courses,
  getCourseMeta,
  getCoursePrerequisites,
  getCoursePrice,
  getCourseRoadmap,
  getCourseSections,
  isCoursePurchased,
} from "@/lib/mock-data";

export default function CoursePage() {
  const params = useParams();
  const { user } = useAuth();
  const course = courses.find((item) => item.id === (params.id as string));

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

  const sections = getCourseSections(course, user);
  const roadmap = getCourseRoadmap(course);
  const prerequisites = getCoursePrerequisites(course);
  const meta = getCourseMeta(course);
  const pct = Math.round((course.completedLessons / course.totalLessons) * 100);
  const freeSections = sections.filter((section) => section.isFree).length;
  const lockedSections = sections.filter((section) => section.isLocked).length;
  const purchased = isCoursePurchased(course, user);

  return (
    <AppShell>
      <div className="space-y-6">
        <section
          className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${course.cover} p-6 text-white shadow-lg sm:p-8`}
        >
          <BookOpen className="absolute right-6 top-6 h-20 w-20 text-white/15" />
          <div className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            {course.interest} • {course.track}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
          <p className="mt-2 max-w-2xl text-sm uppercase tracking-[0.2em] text-white/75">
            Tutor: {meta.teacherName} • ${getCoursePrice(course)} • {purchased ? "Purchased" : "Preview mode"}
          </p>
          <p className="mt-3 max-w-2xl text-white/85">{course.description}</p>
          <div className="mt-5 max-w-md">
            <ProgressBar value={pct} label={`${course.completedLessons} of ${course.totalLessons} lessons completed`} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              {freeSections} free section{freeSections > 1 ? "s" : ""}
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              {lockedSections} locked section{lockedSections !== 1 ? "s" : ""}
            </div>
            {lockedSections > 0 && (
              <Link href="/pricing">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Unlock Full Course
                </Button>
              </Link>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                    Course sections
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Free sections first, locked sections after purchase
                  </h2>
                </div>
                {lockedSections > 0 && (
                  <Link href="/pricing">
                    <Button variant="accent">Unlock Full Course</Button>
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
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                          section.isLocked
                            ? "bg-muted text-muted-foreground"
                            : section.isFree
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {section.isLocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Locked
                          </>
                        ) : section.isFree ? (
                          "Free"
                        ) : (
                          "Unlocked"
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.lessons.map((lesson, lessonIndex) => (
                        <LessonCard key={lesson.id} lesson={lesson} index={lessonIndex} />
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                        Section task
                      </div>
                      {section.tasks.map((task) => (
                        <div key={task.id} className="mt-3">
                          <div className="font-medium">{task.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{task.description}</div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {task.submissionInstructions}
                          </div>
                          {task.submissionLink && (
                            <a
                              href={task.submissionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-sm font-semibold text-primary"
                            >
                              Open submission channel
                            </a>
                          )}
                          {task.helpVideoLink && (
                            <a
                              href={task.helpVideoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 ml-4 inline-flex text-sm font-semibold text-primary"
                            >
                              Watch submission guide
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
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
              <p className="mt-3 text-sm text-muted-foreground">{meta.roadmapText}</p>
              {meta.roadmapLink && (
                <a
                  href={meta.roadmapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary"
                >
                  Open external roadmap
                </a>
              )}
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {roadmap.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Before you start</h2>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {prerequisites.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Quiz and rewards</h2>
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Quiz, leaderboard, and achievements are being prepared. The course structure stays
                active while those gamified features remain unavailable.
              </div>
              <Link href="/coming-soon" className="mt-4 inline-flex">
                <Button variant="outline">Coming Soon</Button>
              </Link>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
