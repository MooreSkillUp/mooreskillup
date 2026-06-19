"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Eye,
  FileText,
  FolderGit2,
  Lock,
  Monitor,
  PlayCircle,
  ScrollText,
  Smartphone,
  Tablet,
} from "lucide-react";
import { formatNaira } from "@/lib/commerce";
import { getEmbeddedVideoUrl, getVideoRenderMode } from "@/lib/video";
import type { TeacherCourse, TeacherResourceType } from "@/lib/teacher-platform";

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_OPTIONS: { value: DeviceMode; label: string; icon: typeof Monitor; width: string }[] = [
  { value: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { value: "tablet", label: "Tablet", icon: Tablet, width: "820px" },
  { value: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
];

const RESOURCE_LABELS: Record<TeacherResourceType, string> = {
  pdf: "PDF",
  documentation: "Docs",
  github: "GitHub",
  google_drive: "Drive",
  zip: "ZIP",
  website: "Website",
};

const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export function LearnerCoursePreview({ course }: { course: TeacherCourse }) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(
    course.sections[0] ? [course.sections[0].id] : [],
  );
  const deviceWidth = DEVICE_OPTIONS.find((option) => option.value === device)?.width ?? "100%";
  const isStacked = device !== "desktop";

  return (
    <div className="space-y-4">
      {/* Device toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Eye className="h-4 w-4 text-primary" />
          Student preview
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {DEVICE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.value === device;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDevice(option.value)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Device frame */}
      <div className="flex justify-center">
        <div
          className="w-full transition-all duration-300"
          style={{ maxWidth: deviceWidth }}
        >
          <div
            className={`space-y-6 ${
              isStacked ? "rounded-[2rem] border-4 border-muted bg-background p-3 shadow-xl" : ""
            }`}
          >
            <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
              <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {LEVEL_LABELS[course.level]}
                  </span>
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground shadow-sm">
                    Produced by MooreSkillUp
                  </span>
                  {course.certificateEnabled && (
                    <span className="rounded-full bg-success/10 px-3 py-1 text-success">
                      Certificate on completion
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-3xl font-bold">{course.title || "Untitled course"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {course.subtitle || "Course subtitle will appear here for learners."}
                </p>

                <div className="mt-4 text-lg font-bold">
                  {course.price === 0 ? (
                    <span className="text-success">Free</span>
                  ) : course.discountPrice !== null ? (
                    <span className="flex items-center gap-2">
                      <span>{formatNaira(course.discountPrice)}</span>
                      <span className="text-sm font-normal text-muted-foreground line-through">
                        {formatNaira(course.price)}
                      </span>
                    </span>
                  ) : (
                    <span>{formatNaira(course.price)}</span>
                  )}
                </div>

                {course.techStack.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {course.techStack.map((tech) => (
                      <span key={tech} className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className={`grid gap-6 ${isStacked ? "" : "xl:grid-cols-[1.15fr_0.85fr]"}`}>
              <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-2xl font-bold">Course content</h3>
                <div className="mt-5 space-y-4">
                  {course.sections.map((section, index) => {
                    const locked = course.price > 0 && section.accessType === "paid";
                    const isOpen = openSectionIds.includes(section.id);
                    return (
                      <div key={section.id} className="rounded-3xl border border-border bg-background p-5">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSectionIds((current) =>
                              current.includes(section.id)
                                ? current.filter((id) => id !== section.id)
                                : [...current, section.id],
                            )
                          }
                          className="flex w-full flex-col gap-3 text-left md:flex-row md:items-start md:justify-between"
                        >
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
                          <div className="flex flex-wrap items-center gap-2">
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                locked ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"
                              }`}
                            >
                              {locked ? "Paid" : "Free"}
                            </div>
                            <div className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {isOpen ? "Hide" : "Open"}
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="mt-4 space-y-3">
                            {section.lessons.map((lesson, lessonIndex) => (
                              <div key={lesson.id} className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-center gap-2 font-medium">
                                  {locked ? (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  ) : lesson.contentType === "video" ? (
                                    <PlayCircle className="h-4 w-4 text-primary" />
                                  ) : lesson.contentType === "resource" ? (
                                    <FileText className="h-4 w-4 text-accent" />
                                  ) : (
                                    <ScrollText className="h-4 w-4 text-accent" />
                                  )}
                                  Lesson {lessonIndex + 1}: {lesson.title || "Untitled lesson"}
                                </div>

                                {locked ? (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    Locked until the learner pays once to unlock the full course.
                                  </div>
                                ) : lesson.contentType === "video" ? (
                                  lesson.videoUrl.trim() ? (
                                    getVideoRenderMode(lesson.videoUrl) === "iframe" ? (
                                      <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                                        <iframe
                                          src={getEmbeddedVideoUrl(lesson.videoUrl)}
                                          title={lesson.title || "Lesson video"}
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                          className="h-full w-full"
                                        />
                                      </div>
                                    ) : getVideoRenderMode(lesson.videoUrl) === "native" ? (
                                      <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                                        <video src={lesson.videoUrl} controls controlsList="nodownload" className="h-full w-full" />
                                      </div>
                                    ) : (
                                      <div className="mt-2 text-sm text-muted-foreground">
                                        A protected video player opens here when the lesson is added.
                                      </div>
                                    )
                                  ) : (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      A protected video player opens here when the lesson is added.
                                    </div>
                                  )
                                ) : lesson.contentType === "resource" ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {lesson.resourceLinks.filter((link) => link.url.trim()).length ? (
                                      lesson.resourceLinks
                                        .filter((link) => link.url.trim())
                                        .map((link, i) => (
                                          <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40"
                                          >
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            {link.title || RESOURCE_LABELS[link.type]}
                                          </a>
                                        ))
                                    ) : (
                                      <span className="text-sm text-muted-foreground">Resource links will appear here.</span>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className="prose prose-sm mt-2 max-w-none text-muted-foreground dark:prose-invert"
                                    dangerouslySetInnerHTML={{
                                      __html: lesson.textContent || "<p>Text lesson content will appear here.</p>",
                                    }}
                                  />
                                )}
                              </div>
                            ))}

                            {section.tasks.map((task, taskIndex) => (
                              <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-center gap-2 font-medium">
                                  {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <ClipboardCheck className="h-4 w-4 text-primary" />}
                                  Assignment {taskIndex + 1}: {task.title || "Untitled assignment"}
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {locked
                                    ? "Hidden until this section is unlocked."
                                    : stripHtml(task.instructions) || "Assignment instructions will appear here."}
                                </div>
                                {!locked && task.submissionUrl && (
                                  <div className="mt-3 text-sm">
                                    <span className="text-muted-foreground">{task.howToSubmit || "Submit your work here:"} </span>
                                    <a href={task.submissionUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                                      {task.submissionType === "whatsapp-group" ? "Join submission group" : "Open submission link"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}

                            {section.projects.map((project, projectIndex) => (
                              <div key={project.id} className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-center gap-2 font-medium">
                                  {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <FolderGit2 className="h-4 w-4 text-primary" />}
                                  Project {projectIndex + 1}: {project.title || "Untitled project"}
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {locked ? "Hidden until this section is unlocked." : project.description || "Project description will appear here."}
                                </div>
                                {!locked && project.submissionUrl && (
                                  <a href={project.submissionUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-primary underline">
                                    {project.howToSubmit || "Submit project"}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
                      __html: course.overview || "<p>Course overview will appear here once added.</p>",
                    }}
                  />
                </div>

                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                  <h3 className="font-display text-2xl font-bold">Scheme of work</h3>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {course.schemeOfWork || "Scheme of work will appear here once defined."}
                  </div>
                </div>

                {course.roadmapLink && (
                  <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-display text-2xl font-bold">Roadmap</h3>
                    <a href={course.roadmapLink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary">
                      Open roadmap
                    </a>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
