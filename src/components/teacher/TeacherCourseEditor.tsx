"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  FileBarChart,
  GripVertical,
  Layers3,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/teacher/RichTextEditor";
import {
  useTeacherPlatform,
  type TeacherCourse,
  type TeacherLesson,
  type TeacherLessonContentType,
  type TeacherSection,
  type TeacherTask,
  type TeacherTaskSubmissionType,
} from "@/lib/teacher-platform";
import { getEmbeddedVideoUrl, getVideoRenderMode } from "@/lib/video";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildLesson(): TeacherLesson {
  return {
    id: createLocalId("lesson"),
    title: "",
    contentType: "video",
    videoUrl: "",
    textContent: "",
    tags: [],
  };
}

function buildTask(): TeacherTask {
  return {
    id: createLocalId("task"),
    title: "",
    instructions: "",
    submissionType: "text-submission",
    resourceLinks: [],
  };
}

function buildSection(index: number): TeacherSection {
  return {
    id: createLocalId("section"),
    title: `Section ${index}`,
    description: "",
    accessType: index === 1 ? "free" : "paid",
    collapsed: false,
    lessons: [buildLesson()],
    tasks: [],
  };
}

export function TeacherCourseEditor({
  mode,
  courseId,
  platformMode = "teacher",
}: {
  mode: "create" | "edit";
  courseId?: string;
  platformMode?: "teacher" | "admin-owned";
}) {
  const router = useRouter();
  const {
    profile,
    buildEmptyCourse,
    getCourseById,
    saveCourse,
    validateCourse,
    recordActivity,
  } = useTeacherPlatform({ platformMode, courseId });
  const source = courseId ? getCourseById(courseId) : undefined;
  const [course, setCourse] = useState<TeacherCourse>(() => clone(source ?? buildEmptyCourse()));
  const [autosaveMessage, setAutosaveMessage] = useState("Waiting for changes");
  const [manualMessage, setManualMessage] = useState("");
  const [manualMessageTone, setManualMessageTone] = useState<"success" | "warning">("success");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(course.sections[0]?.id ?? null);
  const lastSnapshot = useRef(JSON.stringify(source ?? buildEmptyCourse()));
  const dragSectionId = useRef<string | null>(null);
  const dragLessonRef = useRef<{ sectionId: string; lessonId: string } | null>(null);

  useEffect(() => {
    const nextSource = clone(source ?? buildEmptyCourse());
    setCourse(nextSource);
    setActiveSectionId(nextSource.sections[0]?.id ?? null);
    lastSnapshot.current = JSON.stringify(nextSource);
  }, [buildEmptyCourse, courseId, source]);

  const issues = useMemo(() => validateCourse(course), [course, validateCourse]);
  const incompleteSectionIds = useMemo(
    () =>
      course.sections
        .filter(
          (section) =>
            !section.title.trim() ||
            !section.lessons.length ||
            section.lessons.some((lesson) => {
              if (!lesson.title.trim()) return true;
              if (lesson.contentType === "video") return !lesson.videoUrl.trim();
              return !stripHtml(lesson.textContent);
            }),
        )
        .map((section) => section.id),
    [course.sections],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextSnapshot = JSON.stringify(course);
      if (nextSnapshot === lastSnapshot.current) return;
      void saveCourse(course, "draft", { autosave: true }).then((result) => {
        if (result.ok) {
          lastSnapshot.current = JSON.stringify(result.course);
          setCourse(result.course);
          setAutosaveMessage(`Auto-saved ${result.course.lastUpdated}`);
        }
      });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [course, saveCourse]);

  const updateCourse = <K extends keyof TeacherCourse>(field: K, value: TeacherCourse[K]) => {
    setCourse((current) => ({ ...current, [field]: value }));
  };

  const openPreview = async () => {
    const result = await saveCourse(course, "draft");
    if (!result.ok) {
      setManualMessage("Save the course as a draft before previewing.");
      return;
    }

    persistAndNavigateIfNeeded(result.course);
    const href =
      platformMode === "admin-owned"
        ? `/admin/owned-courses/${result.course.id}/preview`
        : `/teacher/courses/${result.course.id}/preview`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const updateSection = (sectionId: string, updater: (section: TeacherSection) => TeacherSection) => {
    setCourse((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  };

  const addSection = () => {
    const nextSectionId = createLocalId("section");
    setCourse((current) => {
      const nextSection = {
        ...buildSection(current.sections.length + 1),
        id: nextSectionId,
      };
      return {
        ...current,
        sections: [...current.sections, nextSection],
      };
    });
    setActiveSectionId(nextSectionId);
    void recordActivity(
      `Added Section ${course.sections.length + 1} to ${course.title || "Untitled course"}`,
      "edit-course",
    );
  };

  const removeSection = (sectionId: string) => {
    const fallbackSection = buildSection(1);
    setCourse((current) => {
      const remaining = current.sections.filter((section) => section.id !== sectionId);
      return {
        ...current,
        sections: remaining.length ? remaining : [fallbackSection],
      };
    });
    const remaining = course.sections.filter((section) => section.id !== sectionId);
    setActiveSectionId(remaining[0]?.id ?? fallbackSection.id);
  };

  const addLesson = (sectionId: string) => {
    const section = course.sections.find((item) => item.id === sectionId);
    updateSection(sectionId, (current) => ({
      ...current,
      lessons: [...current.lessons, buildLesson()],
    }));
    void recordActivity(
      `Added Lesson ${(section?.lessons.length ?? 0) + 1} to ${section?.title || "a section"}`,
      "edit-course",
    );
  };

  const addTask = (sectionId: string) => {
    const section = course.sections.find((item) => item.id === sectionId);
    updateSection(sectionId, (current) => ({
      ...current,
      tasks: [...current.tasks, buildTask()],
    }));
    void recordActivity(`Added a task to ${section?.title || "a section"}`, "edit-course");
  };

  const moveSection = (fromId: string, toId: string) => {
    setCourse((current) => {
      const sections = [...current.sections];
      const fromIndex = sections.findIndex((section) => section.id === fromId);
      const toIndex = sections.findIndex((section) => section.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return { ...current, sections };
    });
    void recordActivity(`Reordered sections in ${course.title || "Untitled course"}`, "reorder-content");
  };

  const moveLesson = (sectionId: string, fromId: string, toId: string) => {
    updateSection(sectionId, (section) => {
      const lessons = [...section.lessons];
      const fromIndex = lessons.findIndex((lesson) => lesson.id === fromId);
      const toIndex = lessons.findIndex((lesson) => lesson.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return section;
      const [moved] = lessons.splice(fromIndex, 1);
      lessons.splice(toIndex, 0, moved);
      return { ...section, lessons };
    });
    void recordActivity(
      `Reordered lessons inside ${
        course.sections.find((section) => section.id === sectionId)?.title || "a section"
      }`,
      "reorder-content",
    );
  };

  const persistAndNavigateIfNeeded = (resultCourse: TeacherCourse) => {
    setCourse(resultCourse);
    lastSnapshot.current = JSON.stringify(resultCourse);
    if (mode === "create") {
      router.replace(`/teacher/courses/${resultCourse.id}/edit`);
    }
  };

  const showManualMessage = (message: string, tone: "success" | "warning" = "success") => {
    setManualMessage(message);
    setManualMessageTone(tone);
  };

  const saveDraft = async () => {
    const result = await saveCourse({ ...course, status: "draft" }, "draft");
    if (!result.ok) return;
    persistAndNavigateIfNeeded(result.course);
    showManualMessage("Course saved as draft.");
  };

  const publish = async () => {
    const result = await saveCourse({ ...course, status: "published" }, "publish");
    if (!result.ok) {
      showManualMessage("Fix validation issues before publishing.", "warning");
      return;
    }
    persistAndNavigateIfNeeded(result.course);
    showManualMessage("Course published successfully.");
  };

  const unpublish = async () => {
    const result = await saveCourse({ ...course, status: "draft" }, "unpublish");
    if (!result.ok) return;
    persistAndNavigateIfNeeded(result.course);
    showManualMessage("Course moved back to draft.");
  };

  const archive = async () => {
    const result = await saveCourse({ ...course, status: "archived", visibility: "hidden" }, "archive");
    if (!result.ok) return;
    persistAndNavigateIfNeeded(result.course);
    showManualMessage("Course archived.");
  };

  const restore = async () => {
    const result = await saveCourse({ ...course, status: "draft", visibility: "hidden" }, "restore");
    if (!result.ok) return;
    persistAndNavigateIfNeeded(result.course);
    showManualMessage("Course restored to draft.");
  };

  const progressLabel = `${course.sections.length} section${course.sections.length === 1 ? "" : "s"} | ${
    course.sections.reduce((sum, section) => sum + section.lessons.length, 0)
  } lessons | ${course.sections.reduce((sum, section) => sum + section.tasks.length, 0)} tasks`;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft px-6 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                {mode === "create" ? "Create course" : "Edit course"}
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold">
                {mode === "create"
                  ? "Teacher course studio"
                  : course.title || "Untitled course"}
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Build a complete instructor-ready LMS course with sections, lessons, tasks,
                preview mode, scoped categories, and protected publishing rules.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={saveDraft}>
                <Save className="h-4 w-4" /> Save as Draft
              </Button>
              <Button variant="outline" onClick={openPreview}>
                <Eye className="h-4 w-4" /> Preview
              </Button>
              {course.status === "published" ? (
                <Button variant="outline" onClick={unpublish}>
                  Unpublish
                </Button>
              ) : course.status === "archived" ? (
                <Button variant="outline" onClick={restore}>
                  Restore to Draft
                </Button>
              ) : (
                <Button variant="accent" onClick={publish}>
                  <Upload className="h-4 w-4" /> Publish
                </Button>
              )}
              {course.status !== "archived" && (
                <Button variant="outline" onClick={archive}>
                  Archive
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Status: {course.status}</span>
            <span>Visibility: {course.visibility}</span>
            <span>{progressLabel}</span>
            <span>Auto-save: {autosaveMessage}</span>
          </div>
          {manualMessage && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                manualMessageTone === "success"
                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100"
                  : "border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100"
              }`}
            >
              {manualMessage}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_24rem]">
        <section className="space-y-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              value={course.title}
              onChange={(event) => updateCourse("title", event.target.value)}
            />
            <Input
              label="Subtitle"
              value={course.subtitle}
              onChange={(event) => updateCourse("subtitle", event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Program</label>
              <Input value={course.program || profile.program} readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Track</label>
              <select
                value={course.track || profile.tracks[0] || profile.track}
                onChange={(event) => updateCourse("track", event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                {(profile.tracks.length ? profile.tracks : profile.track ? [profile.track] : []).map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Program is inherited automatically. Track is chosen from the tracks assigned to this teacher for the current course.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Course Price"
              type="number"
              min="0"
              value={String(course.price)}
              onChange={(event) => updateCourse("price", Number(event.target.value || 0))}
              hint="Set 0 for a fully free course. Any value above 0 unlocks the full course after one payment."
            />
            <Input
              label="Tags"
              value={course.tags.join(", ")}
              onChange={(event) =>
                updateCourse(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
              hint="Separate tags with commas."
            />
            <Input label="Roadmap Link" value={course.roadmapLink} onChange={(event) => updateCourse("roadmapLink", event.target.value)} />
          </div>

          <RichTextEditor
            label="Course Overview"
            value={course.overview}
            onChange={(value) => updateCourse("overview", value)}
            placeholder="Summarize outcomes, expectations, and who this course is for."
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Scheme of Work</label>
            <Textarea
              value={course.schemeOfWork}
              onChange={(event) => updateCourse("schemeOfWork", event.target.value)}
              className="min-h-28 bg-background"
              placeholder="Break down the delivery plan, milestones, and pacing."
            />
          </div>

          <div className="rounded-[1.75rem] border border-border bg-background p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Course structure builder</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Course → Sections → Lessons → Tasks with drag-and-drop reordering and collapsible sections.
                </p>
              </div>
              <Button variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4" /> Add Section
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {course.sections.map((section, sectionIndex) => {
                const sectionIncomplete = incompleteSectionIds.includes(section.id);
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => {
                      dragSectionId.current = section.id;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragSectionId.current) {
                        moveSection(dragSectionId.current, section.id);
                      }
                      dragSectionId.current = null;
                    }}
                    className={`rounded-3xl border p-5 shadow-sm transition ${
                      sectionIncomplete
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveSectionId(section.id)}
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <div className="rounded-xl border border-border p-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                            Section {sectionIndex + 1}
                          </div>
                          <div className="mt-1 font-display text-xl font-bold">
                            {section.title || "Untitled section"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {section.lessons.length} lessons • {section.tasks.length} tasks •{" "}
                            {section.accessType === "free" ? "Free access" : "Paid access"}
                          </div>
                          {sectionIncomplete && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Incomplete section
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => addLesson(section.id)}>
                          <Plus className="h-4 w-4" /> Add Lesson
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addTask(section.id)}>
                          <Plus className="h-4 w-4" /> Add Task
                        </Button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSection(section.id, (current) => ({
                              ...current,
                              collapsed: !current.collapsed,
                            }))
                          }
                          className="rounded-xl border border-border p-2"
                          aria-label={section.collapsed ? "Expand section" : "Collapse section"}
                        >
                          {section.collapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(section.id)}
                          className="rounded-xl border border-border p-2 text-muted-foreground"
                          aria-label="Delete section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {!section.collapsed && (
                      <div className="mt-5 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            label="Section Title"
                            value={section.title}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Access Type</label>
                            <select
                              value={section.accessType}
                              onChange={(event) =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  accessType: event.target.value as TeacherSection["accessType"],
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                            >
                              <option value="free">Free</option>
                              <option value="paid">Paid</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Description</label>
                          <Textarea
                            value={section.description}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className="min-h-24 bg-background"
                            placeholder="Describe what learners should achieve in this section."
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Lessons</div>
                            <div className="text-sm text-muted-foreground">
                              Reorder lessons by dragging the handles.
                            </div>
                          </div>

                          {section.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              draggable
                              onDragStart={() => {
                                dragLessonRef.current = { sectionId: section.id, lessonId: lesson.id };
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (
                                  dragLessonRef.current &&
                                  dragLessonRef.current.sectionId === section.id
                                ) {
                                  moveLesson(section.id, dragLessonRef.current.lessonId, lesson.id);
                                }
                                dragLessonRef.current = null;
                              }}
                              className="rounded-2xl border border-border bg-background p-4"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-medium">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  Lesson {lessonIndex + 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(section.id, (current) => ({
                                      ...current,
                                      lessons: current.lessons.filter((item) => item.id !== lesson.id),
                                    }))
                                  }
                                  className="rounded-lg border border-border p-2 text-muted-foreground"
                                  aria-label="Delete lesson"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                                <Input
                                  label="Lesson Title"
                                  value={lesson.title}
                                  onChange={(event) =>
                                    updateLesson(section.id, lesson.id, { title: event.target.value }, setCourse)
                                  }
                                />
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-foreground">Content Type</label>
                                  <select
                                    value={lesson.contentType}
                                    onChange={(event) =>
                                      updateLesson(
                                        section.id,
                                        lesson.id,
                                        {
                                          contentType: event.target.value as TeacherLessonContentType,
                                          videoUrl:
                                            event.target.value === "video" ? lesson.videoUrl : "",
                                          textContent:
                                            event.target.value === "text" ? lesson.textContent : "",
                                        },
                                        setCourse,
                                      )
                                    }
                                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                                  >
                                    <option value="video">Video</option>
                                    <option value="text">Text</option>
                                  </select>
                                </div>
                              </div>

                              {lesson.contentType === "video" ? (
                                <div className="mt-4 space-y-4">
                                  <Input
                                    label="Video URL"
                                    value={lesson.videoUrl}
                                    onChange={(event) =>
                                      updateLesson(
                                        section.id,
                                        lesson.id,
                                        { videoUrl: event.target.value },
                                        setCourse,
                                      )
                                    }
                                    hint="Use a YouTube, Vimeo, or direct hosted video link. Learners will only see the player inside the lesson view."
                                  />
                                  {lesson.videoUrl.trim() && (
                                    <div className="rounded-2xl border border-border bg-card p-4">
                                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                        Learner video preview
                                      </div>
                                      {getVideoRenderMode(lesson.videoUrl) === "iframe" ? (
                                        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                                          <div className="aspect-video w-full bg-black">
                                            <iframe
                                              src={getEmbeddedVideoUrl(lesson.videoUrl)}
                                              title={lesson.title || "Lesson video preview"}
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                              className="h-full w-full"
                                            />
                                          </div>
                                        </div>
                                      ) : getVideoRenderMode(lesson.videoUrl) === "native" ? (
                                        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-black">
                                          <div className="aspect-video w-full">
                                            <video
                                              src={lesson.videoUrl}
                                              controls
                                              controlsList="nodownload"
                                              className="h-full w-full"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-3 text-sm text-destructive">
                                          This link cannot be embedded yet. Use a valid YouTube, Vimeo, or direct video file URL.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4">
                                  <RichTextEditor
                                    label="Text Content"
                                    value={lesson.textContent}
                                    onChange={(value) =>
                                      updateLesson(
                                        section.id,
                                        lesson.id,
                                        { textContent: value },
                                        setCourse,
                                      )
                                    }
                                    placeholder="Write the lesson content learners will read."
                                  />
                                </div>
                              )}

                              <div className="mt-4">
                                <Input
                                  label="Lesson Tags"
                                  placeholder="Example: intro, variables, assignment"
                                  value={lesson.tags.join(", ")}
                                  onChange={(event) =>
                                    updateLesson(
                                      section.id,
                                      lesson.id,
                                      {
                                        tags: event.target.value
                                          .split(",")
                                          .map((tag) => tag.trim())
                                          .filter(Boolean),
                                      },
                                      setCourse,
                                    )
                                  }
                                  hint="Use short labels that describe the lesson topic or purpose."
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Tasks</div>
                            <div className="text-sm text-muted-foreground">
                              Add assignment instructions and optional submission resources.
                            </div>
                          </div>

                          {section.tasks.length ? (
                            section.tasks.map((task) => (
                              <div key={task.id} className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-4 flex items-center justify-between">
                                  <div className="font-medium">Task</div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSection(section.id, (current) => ({
                                        ...current,
                                        tasks: current.tasks.filter((item) => item.id !== task.id),
                                      }))
                                    }
                                    className="rounded-lg border border-border p-2 text-muted-foreground"
                                    aria-label="Delete task"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <Input
                                  label="Task Title"
                                  value={task.title}
                                  onChange={(event) =>
                                    updateTask(section.id, task.id, { title: event.target.value }, setCourse)
                                  }
                                />

                                <div className="mt-4">
                                  <RichTextEditor
                                    label="Instructions"
                                    value={task.instructions}
                                    onChange={(value) =>
                                      updateTask(section.id, task.id, { instructions: value }, setCourse)
                                    }
                                    placeholder="Explain the task, expectations, and submission details."
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Submission Type</label>
                                    <select
                                      value={task.submissionType}
                                      onChange={(event) =>
                                        updateTask(
                                          section.id,
                                          task.id,
                                          {
                                            submissionType:
                                              event.target.value as TeacherTaskSubmissionType,
                                          },
                                          setCourse,
                                        )
                                      }
                                      className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                                    >
                                      <option value="file-upload">File upload</option>
                                      <option value="text-submission">Text submission</option>
                                    </select>
                                  </div>
                                  <Input
                                    label="Resource Links"
                                    placeholder="Example: submission form, GitHub repo, Google Drive folder"
                                    value={task.resourceLinks.join(", ")}
                                    onChange={(event) =>
                                      updateTask(
                                        section.id,
                                        task.id,
                                        {
                                          resourceLinks: event.target.value
                                            .split(",")
                                            .map((item) => item.trim())
                                            .filter(Boolean),
                                        },
                                        setCourse,
                                      )
                                    }
                                    hint="Add the links learners will use to submit or access task resources."
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                              No tasks in this section yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-6 2xl:sticky 2xl:top-6 self-start">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Section navigator</h2>
                <p className="text-sm text-muted-foreground">
                  Jump between sections for smoother editing.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {course.sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    updateSection(section.id, (current) => ({ ...current, collapsed: false }));
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    activeSectionId === section.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {index + 1}. {section.title || "Untitled section"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {section.lessons.length} lessons • {section.tasks.length} tasks
                      </div>
                    </div>
                    {incompleteSectionIds.includes(section.id) && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
                        Incomplete
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <details open className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Course analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Live course metrics based on learner activity and enrollments.
                </p>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Views" value={`${course.analytics.views}`} />
              <MetricCard label="Enrollments" value={`${course.analytics.enrollments}`} />
              <MetricCard label="Completion rate" value={`${course.analytics.completionRate}%`} />
              <MetricCard label="Status" value={course.status} />
            </div>
          </details>

          <details open className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <summary className="cursor-pointer list-none font-display text-2xl font-bold">Validation</summary>
            <div className="mt-4 space-y-3 text-sm">
              {issues.length ? (
                issues.map((issue) => (
                  <div
                    key={issue}
                    className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100"
                  >
                    {issue}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100">
                  This course is ready to publish.
                </div>
              )}
            </div>
          </details>

          <details className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <summary className="cursor-pointer list-none font-display text-2xl font-bold">Validation rules</summary>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/40 p-4">
                Program is inherited from the teacher assignment, and the selected track must come from the assigned track list.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                Publishing is blocked if sections have no lessons or if lessons do not have usable content.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                Learners see embedded video players only, not raw lesson URLs in the course structure.
              </div>
            </div>
          </details>

          <details className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <summary className="cursor-pointer list-none font-display text-2xl font-bold">Preview workflow</summary>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/40 p-4">
                Preview opens in a separate tab so the learner view is not squeezed beside the editor.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                The preview saves the latest draft first, then shows the learner-facing course structure.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                Videos stay inside lesson pages. Section previews only show lesson titles, lesson types, tags, and locked states.
              </div>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function updateLesson(
  sectionId: string,
  lessonId: string,
  patch: Partial<TeacherLesson>,
  setCourse: Dispatch<SetStateAction<TeacherCourse>>,
) {
  setCourse((current) => ({
    ...current,
    sections: current.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            lessons: section.lessons.map((lesson) =>
              lesson.id === lessonId ? { ...lesson, ...patch } : lesson,
            ),
          }
        : section,
    ),
  }));
}

function updateTask(
  sectionId: string,
  taskId: string,
  patch: Partial<TeacherTask>,
  setCourse: Dispatch<SetStateAction<TeacherCourse>>,
) {
  setCourse((current) => ({
    ...current,
    sections: current.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            tasks: section.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
          }
        : section,
    ),
  }));
}
