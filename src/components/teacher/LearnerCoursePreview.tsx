"use client";

import { Lock, PlayCircle, ScrollText, ClipboardCheck, Eye } from "lucide-react";
import { formatNaira } from "@/lib/commerce";
import type { TeacherCourse } from "@/lib/teacher-workspace";

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function LearnerCoursePreview({ course }: { course: TeacherCourse }) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Learner preview
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">{course.title || "Untitled course"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {course.subtitle || "Course subtitle will appear here for learners."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{course.analytics.views} views</span>
            <span>{course.analytics.enrollments} enrollments</span>
            <span>{course.analytics.completionRate}% completion rate</span>
            <span>{course.sections.length} sections</span>
            <span>
              {course.price === 0 ? "₦0 free course" : `${formatNaira(course.price)} unlocks full course`}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {course.tags.length ? (
              course.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
                No tags yet
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-2xl font-bold">Course content</h3>
          <div className="mt-5 space-y-4">
            {course.sections.map((section, index) => {
              const locked = course.price > 0 && section.accessType === "paid";
              return (
                <div key={section.id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                        Section {index + 1}
                      </div>
                      <div className="mt-2 font-display text-xl font-bold">
                        {section.title || "Untitled section"}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {section.description || "Section description goes here."}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        locked
                          ? "bg-muted text-muted-foreground"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {locked ? "Paid" : "Free"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 font-medium">
                          {locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : lesson.contentType === "video" ? (
                            <PlayCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <ScrollText className="h-4 w-4 text-accent" />
                          )}
                          Lesson {lessonIndex + 1}: {lesson.title || "Untitled lesson"}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {locked
                            ? "Locked until the learner pays once to unlock the full course."
                            : lesson.contentType === "video"
                              ? lesson.videoUrl || "Video lesson URL will appear here."
                              : stripHtml(lesson.textContent) || "Text lesson content preview will appear here."}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.tasks.map((task, taskIndex) => (
                      <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 font-medium">
                          {locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                          )}
                          Task {taskIndex + 1}: {task.title || "Untitled task"}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {locked
                            ? "Task details are hidden until this section is unlocked."
                            : stripHtml(task.instructions) || "Task instructions will appear here."}
                        </div>
                        {!locked && task.resourceLinks.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {task.resourceLinks.map((link) => (
                              <span
                                key={link}
                                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                              >
                                {link}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="font-display text-2xl font-bold">Overview</h3>
            </div>
            <div
              className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html:
                  course.overview || "<p>Course overview will appear here once added.</p>",
              }}
            />
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-display text-2xl font-bold">Scheme of work</h3>
            <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {course.schemeOfWork || "Scheme of work will appear here once defined."}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-display text-2xl font-bold">Access and visibility</h3>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/40 p-4">
                Free sections are visible to all learners.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                Course price: {course.price === 0 ? "₦0" : formatNaira(course.price)}.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                Locked sections stay clearly marked until the learner pays once to unlock the full course.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                This preview mirrors the learner-facing organization before publishing.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
