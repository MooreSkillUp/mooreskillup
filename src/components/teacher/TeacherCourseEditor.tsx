"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@/lib/auth";
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
import { TagInput } from "@/components/ui-kit/TagInput";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/teacher/RichTextEditor";
import { useFeedback } from "@/lib/feedback";
import { CourseBanner } from "@/components/course/CourseBanner";
import { formatNaira } from "@/lib/commerce";
import {
  useTeacherPlatform,
  type TeacherCourse,
  type TeacherCourseLevel,
  type TeacherLesson,
  type TeacherLessonContentType,
  type TeacherProject,
  type TeacherResourceLink,
  type TeacherResourceType,
  type TeacherSection,
  type TeacherTask,
  type TeacherCourseVersion,
  type TeacherTaskSubmissionType,
} from "@/lib/teacher-platform";
import { getEmbeddedVideoUrl, getVideoRenderMode } from "@/lib/video";

const LEVEL_OPTIONS: { value: TeacherCourseLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CONTENT_TYPE_OPTIONS: { value: TeacherLessonContentType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text" },
  { value: "resource", label: "Resource" },
];

const SUBMISSION_OPTIONS: { value: TeacherTaskSubmissionType; label: string; hint: string }[] = [
  { value: "whatsapp-group", label: "WhatsApp group", hint: "Paste the group invite link" },
  { value: "google-form", label: "Google Form", hint: "Paste the form link" },
  { value: "external-link", label: "External link", hint: "Any submission page link" },
];

const RESOURCE_TYPE_OPTIONS: { value: TeacherResourceType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "documentation", label: "Documentation" },
  { value: "github", label: "GitHub repo" },
  { value: "google_drive", label: "Google Drive" },
  { value: "zip", label: "ZIP download" },
  { value: "website", label: "Website" },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Keep the user's current (possibly still-being-edited) course content but adopt
 * the real server IDs (by position) from a just-completed save. This lets
 * autosave sync IDs without ever overwriting in-progress edits.
 */
function withServerIds(local: TeacherCourse, server: TeacherCourse): TeacherCourse {
  return {
    ...local,
    id: server.id,
    sections: local.sections.map((section, si) => {
      const s = server.sections[si];
      if (!s) return section;
      return {
        ...section,
        id: s.id,
        lessons: section.lessons.map((lesson, li) => ({ ...lesson, id: s.lessons[li]?.id ?? lesson.id })),
        tasks: section.tasks.map((task, ti) => ({ ...task, id: s.tasks[ti]?.id ?? task.id })),
        projects: section.projects.map((project, pi) => ({ ...project, id: s.projects[pi]?.id ?? project.id })),
      };
    }),
  };
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
    resourceLinks: [],
    tags: [],
  };
}

function buildResourceLink(): TeacherResourceLink {
  return { type: "website", title: "", url: "" };
}

function buildTask(): TeacherTask {
  return {
    id: createLocalId("task"),
    title: "",
    instructions: "",
    submissionType: "whatsapp-group",
    submissionUrl: "",
    howToSubmit: "",
    dueDate: null,
  };
}

function buildProject(): TeacherProject {
  return {
    id: createLocalId("project"),
    title: "",
    description: "",
    requirements: "",
    deliverables: "",
    submissionUrl: "",
    howToSubmit: "",
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
    projects: [],
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
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const {
    profile,
    allowedCategories,
    buildEmptyCourse,
    getCourseById,
    saveCourse,
    validateCourse,
    recordActivity,
    fetchCourseVersions,
    restoreCourseVersion,
  } = useTeacherPlatform({ platformMode, courseId });
  const source = courseId ? getCourseById(courseId) : undefined;
  const [course, setCourse] = useState<TeacherCourse>(() => clone(source ?? buildEmptyCourse()));
  const [autosaveMessage, setAutosaveMessage] = useState("Waiting for changes");
  const [manualMessage, setManualMessage] = useState("");
  const [manualMessageTone, setManualMessageTone] = useState<"success" | "warning">("success");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerIdentityOpen, setBannerIdentityOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<
    "draft" | "preview" | "publish" | "unpublish" | "archive" | "restore" | null
  >(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(course.sections[0]?.id ?? null);
  const lastSnapshot = useRef(JSON.stringify(source ?? buildEmptyCourse()));
  const autosaveBusy = useRef(false);
  const dragSectionId = useRef<string | null>(null);
  const dragLessonRef = useRef<{ sectionId: string; lessonId: string } | null>(null);

  // Initialize the editor ONCE per course. Without this guard, every background
  // save updates the cached source, which would re-run this effect and wipe the
  // teacher's in-progress edits (the "studio resets while I type" bug).
  const initializedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = courseId ?? "new-course";
    // For an existing course, wait until its data has actually loaded.
    if (courseId && !source) return;
    if (initializedKey.current === key) return;
    initializedKey.current = key;
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
              if (lesson.contentType === "resource") {
                return !lesson.resourceLinks.some((link) => link.url.trim());
              }
              return !stripHtml(lesson.textContent);
            }),
        )
        .map((section) => section.id),
    [course.sections],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (autosaveBusy.current) return;
      const startSnapshot = JSON.stringify(course);
      if (startSnapshot === lastSnapshot.current) return;
      autosaveBusy.current = true;
      void saveCourse(course, "draft", { autosave: true, bannerFile })
        .then((result) => {
          if (!result.ok) return;
          setCourse((current) => {
            // If the user kept typing while we saved, keep their current edits and
            // only adopt the server's real IDs — never overwrite their work.
            const merged =
              JSON.stringify(current) === startSnapshot ? result.course : withServerIds(current, result.course);
            lastSnapshot.current = JSON.stringify(merged);
            return merged;
          });
          setAutosaveMessage(`Auto-saved ${result.course.lastUpdated}`);
          setBannerFile(null);
        })
        .finally(() => {
          autosaveBusy.current = false;
        });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [bannerFile, course, saveCourse]);

  const updateCourse = <K extends keyof TeacherCourse>(field: K, value: TeacherCourse[K]) => {
    setCourse((current) => ({ ...current, [field]: value }));
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    // Revoke previous blob URL if it exists to avoid memory leaks
    if (course.bannerImage?.startsWith("blob:")) URL.revokeObjectURL(course.bannerImage);
    const previewUrl = URL.createObjectURL(file);
    updateCourse("bannerImage", previewUrl);
    updateCourse("bannerImageAlt", course.bannerImageAlt || file.name);
    // Auto-open the section so the teacher sees the preview
    setBannerIdentityOpen(true);
  };

  const handleRemoveBanner = () => {
    if (course.bannerImage?.startsWith("blob:")) {
      URL.revokeObjectURL(course.bannerImage);
    }
    setBannerFile(null);
    updateCourse("bannerImage", null);
    updateCourse("bannerImageAlt", "");
    const fileInput = document.getElementById("banner-file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Resolve the category's accent color for the preview (from admin configuration)
  const currentCategory = allowedCategories.find((cat) => cat.id === course.categoryId);
  const previewAccentColor = currentCategory?.accentColor ?? "#FC6104";

  const openPreview = async () => {
    setActiveAction("preview");
    try {
      const result = await saveCourse(course, "draft", { bannerFile });
      if (!result.ok) {
        setManualMessage("Save the course as a draft before previewing.");
        notifyError("Preview unavailable", "Save the course as a draft before previewing.");
        return;
      }

      persistAndNavigateIfNeeded(result.course);
      notifySuccess("Preview opened", "A learner-style preview has opened in a new tab.");
      const href =
        platformMode === "admin-owned"
          ? `/admin/owned-courses/${result.course.id}/preview`
          : `/teacher/courses/${result.course.id}/preview`;
      window.open(href, "_blank", "noopener,noreferrer");
    } finally {
      setActiveAction(null);
    }
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
    void recordActivity(`Added an assignment to ${section?.title || "a section"}`, "edit-course");
  };

  const addProject = (sectionId: string) => {
    const section = course.sections.find((item) => item.id === sectionId);
    updateSection(sectionId, (current) => ({
      ...current,
      projects: [...current.projects, buildProject()],
    }));
    void recordActivity(`Added a project to ${section?.title || "a section"}`, "edit-course");
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
    setActiveAction("draft");
    setValidationErrors([]);
    try {
      const result = await saveCourse({ ...course, status: "draft" }, "draft", { bannerFile });
      if (!result.ok) {
        if (result.issues?.length) {
          setValidationErrors(result.issues);
          showManualMessage("Fix the issues below before saving.", "warning");
        } else {
          showManualMessage("Draft could not be saved. Please try again.", "warning");
          notifyError("Draft not saved", "Please check your course details and try again.");
        }
        return;
      }
      setValidationErrors([]);
      persistAndNavigateIfNeeded(result.course);
      showManualMessage("Course saved as draft.");
      notifySuccess("Draft saved", "You can continue editing this course later from My Courses.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save draft.";
      showManualMessage(message, "warning");
      notifyError("Draft not saved", message);
    } finally {
      setActiveAction(null);
    }
  };

  const publish = async () => {
    setActiveAction("publish");
    setValidationErrors([]);
    try {
      const result = await saveCourse(course, "publish", { bannerFile });
      if (!result.ok) {
        const errs = result.issues?.length
          ? result.issues
          : ["Fix all validation issues before submitting for review."];
        setValidationErrors(errs);
        showManualMessage("Course not ready — see issues below.", "warning");
        notifyError("Course not ready", "Fix the listed issues before submitting for review.");
        return;
      }
      setValidationErrors([]);
      persistAndNavigateIfNeeded(result.course);
      showManualMessage(
        platformMode === "admin-owned"
          ? "Course published successfully."
          : "Course submitted for admin review.",
      );
      notifySuccess(
        platformMode === "admin-owned" ? "Course published" : "Course submitted for review",
        platformMode === "admin-owned"
          ? "The course is now visible to learners."
          : "An admin can now approve or decline the course.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit course.";
      showManualMessage(message, "warning");
      notifyError("Submit failed", message);
    } finally {
      setActiveAction(null);
    }
  };

  const unpublish = async () => {
    setActiveAction("unpublish");
    setValidationErrors([]);
    try {
      const result = await saveCourse({ ...course, status: "draft" }, "unpublish", { bannerFile });
      if (!result.ok) {
        showManualMessage("Unable to unpublish. Please try again.", "warning");
        notifyError("Unpublish failed", "Please try again.");
        return;
      }
      persistAndNavigateIfNeeded(result.course);
      showManualMessage("Course moved back to draft.");
      notifySuccess("Course unpublished", "The course is now in draft and hidden from learners.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to unpublish.";
      showManualMessage(message, "warning");
      notifyError("Unpublish failed", message);
    } finally {
      setActiveAction(null);
    }
  };

  const archive = async () => {
    setActiveAction("archive");
    setValidationErrors([]);
    try {
      const result = await saveCourse(
        { ...course, status: "archived", visibility: "hidden" },
        "archive",
        { bannerFile },
      );
      if (!result.ok) {
        showManualMessage("Unable to archive. Please try again.", "warning");
        notifyError("Archive failed", "Please try again.");
        return;
      }
      persistAndNavigateIfNeeded(result.course);
      showManualMessage("Course archived and hidden from learners.");
      notifySuccess("Course archived", "You can restore it to a draft at any time.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to archive.";
      showManualMessage(message, "warning");
      notifyError("Archive failed", message);
    } finally {
      setActiveAction(null);
    }
  };

  const restore = async () => {
    setActiveAction("restore");
    setValidationErrors([]);
    try {
      const result = await saveCourse(
        { ...course, status: "draft", visibility: "hidden" },
        "restore",
        { bannerFile },
      );
      if (!result.ok) {
        showManualMessage("Unable to restore. Please try again.", "warning");
        notifyError("Restore failed", "Please try again.");
        return;
      }
      persistAndNavigateIfNeeded(result.course);
      showManualMessage("Course restored to draft — ready to edit.");
      notifySuccess("Draft restored", "The course is back in draft mode.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore.";
      showManualMessage(message, "warning");
      notifyError("Restore failed", message);
    } finally {
      setActiveAction(null);
    }
  };

  const lessonCount = course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
  const assignmentCount = course.sections.reduce((sum, section) => sum + section.tasks.length, 0);
  const projectCount = course.sections.reduce((sum, section) => sum + section.projects.length, 0);
  const progressLabel = `${course.sections.length} section${course.sections.length === 1 ? "" : "s"} | ${lessonCount} lessons | ${assignmentCount} assignments | ${projectCount} projects`;

  const publishActionLabel =
    platformMode === "admin-owned"
      ? "Publish"
      : course.status === "declined"
        ? "Resubmit for review"
        : "Submit for review";

  const publishBlockedLabel =
    course.status === "review"
      ? "Awaiting admin review"
      : course.status === "approved"
        ? "Approved — admin will publish"
        : null;

  const canSubmitForReview =
    platformMode === "admin-owned" ||
    (course.status !== "published" && course.status !== "archived" && !publishBlockedLabel);

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
              <Button variant="outline" onClick={saveDraft} loading={activeAction === "draft"} loadingText="Saving draft...">
                <Save className="h-4 w-4" /> Save as Draft
              </Button>
              <Button variant="outline" onClick={openPreview} loading={activeAction === "preview"} loadingText="Opening preview...">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              {course.status === "published" ? (
                <Button variant="outline" onClick={unpublish} loading={activeAction === "unpublish"} loadingText="Updating...">
                  Unpublish
                </Button>
              ) : course.status === "archived" ? (
                <Button variant="outline" onClick={restore} loading={activeAction === "restore"} loadingText="Restoring...">
                  Restore to Draft
                </Button>
              ) : publishBlockedLabel ? (
                <Button variant="accent" disabled title={publishBlockedLabel}>
                  {publishBlockedLabel}
                </Button>
              ) : canSubmitForReview ? (
                <Button variant="accent" onClick={publish} loading={activeAction === "publish"} loadingText={platformMode === "admin-owned" ? "Publishing..." : "Submitting..."}>
                  <Upload className="h-4 w-4" /> {publishActionLabel}
                </Button>
              ) : null}
              {course.status !== "archived" && (
                <Button variant="outline" onClick={archive} loading={activeAction === "archive"} loadingText="Archiving...">
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
          {validationErrors.length > 0 && (
            <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3">
              <div className="text-sm font-semibold text-destructive">Issues to fix before publishing:</div>
              <ul className="mt-2 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <span className="mt-0.5 shrink-0">•</span>
                    {err}
                  </li>
                ))}
              </ul>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Level</label>
              <select
                value={course.level}
                onChange={(event) => updateCourse("level", event.target.value as TeacherCourseLevel)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Roadmap Link" value={course.roadmapLink} onChange={(event) => updateCourse("roadmapLink", event.target.value)} />
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="text-sm font-medium text-foreground">Pricing</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { value: 0, label: "Free" },
                { value: 1, label: "Paid" },
              ] as const).map((option) => {
                const isPaid = option.value === 1;
                const active = isPaid ? course.price > 0 : course.price === 0;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      updateCourse("price", isPaid ? (course.price > 0 ? course.price : 10000) : 0)
                    }
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {course.price > 0 && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input
                  label="Price (NGN)"
                  type="number"
                  min="0"
                  value={String(course.price)}
                  onChange={(event) => updateCourse("price", Number(event.target.value || 0))}
                />
                <Input
                  label="Discount price (optional)"
                  type="number"
                  min="0"
                  value={course.discountPrice === null ? "" : String(course.discountPrice)}
                  onChange={(event) =>
                    updateCourse(
                      "discountPrice",
                      event.target.value === "" ? null : Number(event.target.value),
                    )
                  }
                  hint="Shown as a slashed original price next to the discounted one."
                />
              </div>
            )}
          </div>

          {/* Banner & visual identity — collapsible */}
          <div className="rounded-2xl border border-border bg-background">
            <button
              type="button"
              onClick={() => setBannerIdentityOpen((open) => !open)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-foreground"
            >
              <span>Banner &amp; visual identity</span>
              {bannerIdentityOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {bannerIdentityOpen && (
              <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
                {/* File picker */}
                <div className="rounded-[1.5rem] border border-border p-4">
                  <label className="text-sm font-medium text-foreground">Course banner image</label>
                  <input
                    id="banner-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Upload a hero image for the student course page and course cards. The file is saved with the course.
                  </p>
                  {course.bannerImage && (
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Banner Image
                    </button>
                  )}
                </div>

                {/* Alt text only — theme is driven by the category accent color set by admin */}
                <Input
                  label="Banner alt text"
                  value={course.bannerImageAlt}
                  onChange={(event) => updateCourse("bannerImageAlt", event.target.value)}
                  hint="Describe the banner image for accessibility."
                />

                {/* Live preview */}
                <div className="rounded-[1.25rem] border border-border bg-card p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-3">Live Preview (Student Card view)</div>
                  <div className="overflow-hidden rounded-[1.25rem] border border-border">
                    <CourseBanner
                      title={course.title || "Untitled course"}
                      subtitle={course.subtitle || "Your course subtitle will show here."}
                      category={course.program || profile?.program || "MooreSkillUp"}
                      track={course.track || "Sample Track"}
                      level={course.level ? (course.level.charAt(0).toUpperCase() + course.level.slice(1)) : "Beginner"}
                      durationLabel={`${course.sections.reduce((sum, s) => sum + s.lessons.length, 0)} lessons`}
                      priceLabel={course.price === 0 ? "Free" : (course.discountPrice !== null && course.discountPrice < course.price ? formatNaira(course.discountPrice) : formatNaira(course.price))}
                      certificateEnabled={course.certificateEnabled}
                      compact
                      bannerImage={course.bannerImage}
                      bannerTheme={course.bannerTheme || "default"}
                      categoryAccentColor={previewAccentColor}
                    />
                  </div>
                  {/* Category accent color indicator */}
                  <div className="mt-3 flex items-center gap-2 px-1">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ background: previewAccentColor }}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Accent color from program &quot;{currentCategory?.name ?? course.program ?? "—"}&quot;: {previewAccentColor}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TagInput
              label="Tech stack"
              value={course.techStack}
              onChange={(value) => updateCourse("techStack", value)}
              hint="Tools the course teaches, e.g. React, Python, Figma. Shown as chips on the course card."
            />
            <TagInput
              label="Tags"
              value={course.tags}
              onChange={(value) => updateCourse("tags", value)}
              hint="Search keywords. Separate with commas or Enter."
            />
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

          {/* SEO + certification */}
          <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
            <div className="text-sm font-medium text-foreground">Discoverability & certification</div>
            <Input
              label="SEO meta title"
              value={course.metaTitle}
              onChange={(event) => updateCourse("metaTitle", event.target.value)}
              hint="Title shown in search engines and shared links (defaults to the course title)."
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">SEO meta description</label>
              <Textarea
                value={course.metaDescription}
                onChange={(event) => updateCourse("metaDescription", event.target.value)}
                className="min-h-20 bg-background"
                placeholder="One or two sentences describing the course for search results."
              />
            </div>
            <label className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
              <span>
                <span className="font-medium">Ready for certification</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  When on, students who complete this course are automatically issued a MooreSkillUp
                  certificate.
                </span>
              </span>
              <input
                type="checkbox"
                checked={course.certificateEnabled}
                onChange={(event) => updateCourse("certificateEnabled", event.target.checked)}
                className="mt-1 h-5 w-5 accent-primary"
              />
            </label>
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
                          <Plus className="h-4 w-4" /> Add Assignment
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addProject(section.id)}>
                          <Plus className="h-4 w-4" /> Add Project
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
                                    {CONTENT_TYPE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
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
                                    <details className="group rounded-2xl border border-border bg-card p-4">
                                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                        Learner video preview
                                        <span className="text-[10px] font-normal normal-case text-muted-foreground">
                                          <span className="group-open:hidden">Show ▸</span>
                                          <span className="hidden group-open:inline">Hide ▾</span>
                                        </span>
                                      </summary>
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
                                    </details>
                                  )}
                                </div>
                              ) : lesson.contentType === "text" ? (
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
                              ) : (
                                <ResourceLinksEditor
                                  links={lesson.resourceLinks}
                                  onChange={(resourceLinks) =>
                                    updateLesson(section.id, lesson.id, { resourceLinks }, setCourse)
                                  }
                                />
                              )}

                              <div className="mt-4">
                                <TagInput
                                  label="Lesson Tags"
                                  placeholder="Example: intro, variables, assignment"
                                  value={lesson.tags}
                                  onChange={(value) =>
                                    updateLesson(
                                      section.id,
                                      lesson.id,
                                      { tags: value },
                                      setCourse,
                                    )
                                  }
                                  hint="Use comma-separated short labels for the lesson topic or purpose."
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Assignments</div>
                            <div className="text-sm text-muted-foreground">
                              Students submit off-platform — no uploads or grading.
                            </div>
                          </div>

                          {section.tasks.length ? (
                            section.tasks.map((task) => (
                              <div key={task.id} className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-4 flex items-center justify-between">
                                  <div className="font-medium">Assignment</div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSection(section.id, (current) => ({
                                        ...current,
                                        tasks: current.tasks.filter((item) => item.id !== task.id),
                                      }))
                                    }
                                    className="rounded-lg border border-border p-2 text-muted-foreground"
                                    aria-label="Delete assignment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <Input
                                  label="Assignment title"
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
                                    placeholder="Explain the assignment and what learners should produce."
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Submission method</label>
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
                                      {SUBMISSION_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Input
                                    label="Submission link"
                                    placeholder="https://chat.whatsapp.com/..."
                                    value={task.submissionUrl}
                                    onChange={(event) =>
                                      updateTask(section.id, task.id, { submissionUrl: event.target.value }, setCourse)
                                    }
                                    hint={
                                      SUBMISSION_OPTIONS.find((option) => option.value === task.submissionType)?.hint
                                    }
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <Input
                                    label="How to submit (shown to students)"
                                    placeholder="e.g. Post your repo link in the WhatsApp group"
                                    value={task.howToSubmit}
                                    onChange={(event) =>
                                      updateTask(section.id, task.id, { howToSubmit: event.target.value }, setCourse)
                                    }
                                  />
                                  <Input
                                    label="Due date (optional)"
                                    type="date"
                                    value={task.dueDate ?? ""}
                                    onChange={(event) =>
                                      updateTask(
                                        section.id,
                                        task.id,
                                        { dueDate: event.target.value || null },
                                        setCourse,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                              No assignments in this section yet.
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Projects</div>
                            <div className="text-sm text-muted-foreground">
                              Larger build tasks completed off-platform.
                            </div>
                          </div>

                          {section.projects.length ? (
                            section.projects.map((project) => (
                              <div key={project.id} className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-4 flex items-center justify-between">
                                  <div className="font-medium">Project</div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSection(section.id, (current) => ({
                                        ...current,
                                        projects: current.projects.filter((item) => item.id !== project.id),
                                      }))
                                    }
                                    className="rounded-lg border border-border p-2 text-muted-foreground"
                                    aria-label="Delete project"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <Input
                                  label="Project title"
                                  value={project.title}
                                  onChange={(event) =>
                                    updateProject(section.id, project.id, { title: event.target.value }, setCourse)
                                  }
                                />

                                <div className="mt-4 space-y-2">
                                  <label className="text-sm font-medium text-foreground">Description</label>
                                  <Textarea
                                    value={project.description}
                                    onChange={(event) =>
                                      updateProject(section.id, project.id, { description: event.target.value }, setCourse)
                                    }
                                    className="min-h-20 bg-background"
                                    placeholder="What the project is about."
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Requirements</label>
                                    <Textarea
                                      value={project.requirements}
                                      onChange={(event) =>
                                        updateProject(section.id, project.id, { requirements: event.target.value }, setCourse)
                                      }
                                      className="min-h-20 bg-background"
                                      placeholder="What learners must include."
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Deliverables</label>
                                    <Textarea
                                      value={project.deliverables}
                                      onChange={(event) =>
                                        updateProject(section.id, project.id, { deliverables: event.target.value }, setCourse)
                                      }
                                      className="min-h-20 bg-background"
                                      placeholder="What learners must hand in."
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <Input
                                    label="Submission link"
                                    placeholder="https://forms.gle/..."
                                    value={project.submissionUrl}
                                    onChange={(event) =>
                                      updateProject(section.id, project.id, { submissionUrl: event.target.value }, setCourse)
                                    }
                                  />
                                  <Input
                                    label="How to submit (shown to students)"
                                    value={project.howToSubmit}
                                    onChange={(event) =>
                                      updateProject(section.id, project.id, { howToSubmit: event.target.value }, setCourse)
                                    }
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                              No projects in this section yet.
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

          {platformMode === "teacher" && mode === "edit" && (
            <VersionHistoryPanel
              courseId={course.id}
              fetchCourseVersions={fetchCourseVersions}
              onRestore={async (versionId) => {
                const restored = await restoreCourseVersion(course.id, versionId);
                setCourse(clone(restored));
                lastSnapshot.current = JSON.stringify(restored);
                setActiveSectionId(restored.sections[0]?.id ?? null);
              }}
            />
          )}

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

function VersionHistoryPanel({
  courseId,
  fetchCourseVersions,
  onRestore,
}: {
  courseId: string;
  fetchCourseVersions: (courseId: string) => Promise<TeacherCourseVersion[]>;
  onRestore: (versionId: string) => Promise<void>;
}) {
  const { notifyError, notifySuccess } = useFeedback();
  const [versions, setVersions] = useState<TeacherCourseVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setVersions(await fetchCourseVersions(courseId));
      setLoaded(true);
    } catch (error) {
      notifyError("Unable to load versions", error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <details
      className="rounded-[2rem] border border-border bg-card p-6 shadow-sm"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open && !loaded) void load();
      }}
    >
      <summary className="cursor-pointer list-none font-display text-2xl font-bold">Version history</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        A snapshot is saved each time you submit for review. Restore brings the course structure back to
        that point (current work is snapshotted first, so nothing is lost).
      </p>
      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm text-muted-foreground">Loading versions...</div>}
        {loaded && !versions.length && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No saved versions yet. Submit the course for review to create your first snapshot.
          </div>
        )}
        {versions.map((version) => (
          <div key={version.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
            <div>
              <div className="font-medium">Version {version.versionNumber}</div>
              <div className="text-xs text-muted-foreground">
                {version.note || "Snapshot"} · {version.sectionCount} sections ·{" "}
                {new Date(version.createdAt).toLocaleString("en-NG")}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              loading={restoringId === version.id}
              loadingText="Restoring..."
              onClick={async () => {
                setRestoringId(version.id);
                try {
                  await onRestore(version.id);
                  notifySuccess("Course restored", `Restored to version ${version.versionNumber}.`);
                  await load();
                } catch (error) {
                  notifyError("Restore failed", error instanceof Error ? error.message : "Request failed.");
                } finally {
                  setRestoringId(null);
                }
              }}
            >
              Restore
            </Button>
          </div>
        ))}
      </div>
    </details>
  );
}

function ResourceLinksEditor({
  links,
  onChange,
}: {
  links: TeacherResourceLink[];
  onChange: (links: TeacherResourceLink[]) => void;
}) {
  const update = (index: number, patch: Partial<TeacherResourceLink>) => {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };
  const add = () => onChange([...links, buildResourceLink()]);
  const remove = (index: number) => onChange(links.filter((_, i) => i !== index));

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Resources</label>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add resource
        </Button>
      </div>
      {links.length ? (
        links.map((link, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-border bg-card p-3 md:grid-cols-[160px_1fr_1fr_auto]">
            <select
              value={link.type}
              onChange={(event) => update(index, { type: event.target.value as TeacherResourceType })}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Title (e.g. Starter repo)"
              value={link.title}
              onChange={(event) => update(index, { title: event.target.value })}
            />
            <Input
              placeholder="https://..."
              value={link.url}
              onChange={(event) => update(index, { url: event.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-lg border border-border p-2 text-muted-foreground"
              aria-label="Remove resource"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Add downloadable files or links: PDFs, GitHub repos, Google Drive, docs, ZIP, or websites.
        </div>
      )}
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

function updateProject(
  sectionId: string,
  projectId: string,
  patch: Partial<TeacherProject>,
  setCourse: Dispatch<SetStateAction<TeacherCourse>>,
) {
  setCourse((current) => ({
    ...current,
    sections: current.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            projects: section.projects.map((project) =>
              project.id === projectId ? { ...project, ...patch } : project,
            ),
          }
        : section,
    ),
  }));
}
