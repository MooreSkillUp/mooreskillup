import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_STORAGE_KEY = "mooreskillup.access-token";
const REFRESH_TOKEN_STORAGE_KEY = "mooreskillup.refresh-token";

export type TeacherCourseStatus = "draft" | "published" | "archived";
export type TeacherCourseVisibility = "visible" | "hidden";
export type TeacherSectionAccess = "free" | "paid";
export type TeacherLessonContentType = "video" | "text";
export type TeacherTaskSubmissionType = "file-upload" | "text-submission";
export type TeacherActivityType =
  | "create-course"
  | "edit-course"
  | "publish-course"
  | "unpublish-course"
  | "save-draft"
  | "delete-course"
  | "reorder-content"
  | "settings-update";

export interface TeacherCategorySubcategory {
  id: string;
  name: string;
}

export interface TeacherCategory {
  id: string;
  name: string;
  program: string;
  subcategories: TeacherCategorySubcategory[];
}

export interface TeacherLesson {
  id: string;
  title: string;
  contentType: TeacherLessonContentType;
  videoUrl: string;
  textContent: string;
}

export interface TeacherTask {
  id: string;
  title: string;
  instructions: string;
  submissionType: TeacherTaskSubmissionType;
  resourceLinks: string[];
}

export interface TeacherSection {
  id: string;
  title: string;
  description: string;
  accessType: TeacherSectionAccess;
  collapsed: boolean;
  lessons: TeacherLesson[];
  tasks: TeacherTask[];
}

export interface TeacherCourseAnalytics {
  views: number;
  enrollments: number;
  completionRate: number;
}

export interface TeacherCourse {
  id: string;
  teacherId: string;
  title: string;
  subtitle: string;
  categoryId: string;
  subcategoryId: string;
  program: string;
  track: string;
  tags: string[];
  roadmapLink: string;
  overview: string;
  schemeOfWork: string;
  price: number;
  status: TeacherCourseStatus;
  visibility: TeacherCourseVisibility;
  sections: TeacherSection[];
  analytics: TeacherCourseAnalytics;
  lastUpdated: string;
  createdAt: string;
}

export interface TeacherActivity {
  id: string;
  message: string;
  timestamp: string;
  createdAt: string;
  type: TeacherActivityType;
}

export interface TeacherProfileSettings {
  displayName: string;
  email: string;
  program: string;
  track: string;
}

export interface TeacherDashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  activeCourses: number;
  totalLearners: number;
}

interface TeacherDashboardPayload {
  teacher: {
    id: string;
    displayName: string;
    email: string;
    program: string;
    track: string;
  };
  stats: TeacherDashboardStats;
  recentActivities?: unknown;
  recentCourses?: unknown;
}

interface PaginatedResponse<T> {
  results?: T[];
}

function buildApiUrl(endpoint: string) {
  return `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  if ("detail" in payload && typeof payload.detail === "string") return payload.detail;
  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

function normalizeListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    "results" in payload &&
    Array.isArray((payload as PaginatedResponse<T>).results)
  ) {
    return (payload as PaginatedResponse<T>).results ?? [];
  }
  return [];
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Session refresh is unavailable.");
  }
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error("Your session has expired. Please log in again.");
  }
  const response = await fetch(buildApiUrl("/api/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const payload = await parseJsonSafely(response);
  if (!response.ok || !payload || typeof payload.access !== "string") {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    throw new Error(extractErrorMessage(payload, "Your session has expired. Please log in again."));
  }
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, payload.access);
  if (typeof payload.refresh === "string") {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refresh);
  }
  return payload.access as string;
}

async function authenticatedRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("Authenticated requests are unavailable.");
  }

  const send = async (token: string | null) =>
    fetch(buildApiUrl(endpoint), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

  let accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  let response = await send(accessToken);

  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    response = await send(accessToken);
  }

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Request failed."));
  }

  return payload as T;
}

function normalizeCategory(category: Record<string, unknown>): TeacherCategory {
  return {
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
    program: String(category.program ?? category.name ?? ""),
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.map((subcategory) => ({
          id: String((subcategory as Record<string, unknown>).id ?? ""),
          name: String((subcategory as Record<string, unknown>).name ?? ""),
        }))
      : [],
  };
}

function normalizeCourse(raw: Record<string, unknown>): TeacherCourse {
  const analytics = (raw.analytics ?? {}) as Record<string, unknown>;
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    id: String(raw.id ?? ""),
    teacherId: String(raw.teacherId ?? ""),
    title: String(raw.title ?? ""),
    subtitle: String(raw.subtitle ?? ""),
    categoryId: String(raw.categoryId ?? raw.category ?? ""),
    subcategoryId: String(raw.subcategoryId ?? raw.subcategory ?? ""),
    program: String(raw.program ?? raw.categoryName ?? ""),
    track: String(raw.track ?? raw.subcategoryName ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag)) : [],
    roadmapLink: String(raw.roadmap_link ?? raw.roadmapLink ?? ""),
    overview: String(raw.overview ?? ""),
    schemeOfWork: String(raw.scheme_of_work ?? raw.schemeOfWork ?? ""),
    price: Number(raw.price ?? 0),
    status: (String(raw.status ?? "draft") as TeacherCourseStatus),
    visibility: (String(raw.visibility ?? "hidden") as TeacherCourseVisibility),
    sections: sections.map((section) => {
      const typedSection = section as Record<string, unknown>;
      return {
        id: String(typedSection.id ?? ""),
        title: String(typedSection.title ?? ""),
        description: String(typedSection.description ?? ""),
        accessType: (String(typedSection.access_type ?? typedSection.accessType ?? "free") as TeacherSectionAccess),
        collapsed: false,
        lessons: Array.isArray(typedSection.lessons)
          ? typedSection.lessons.map((lesson) => {
              const typedLesson = lesson as Record<string, unknown>;
              return {
                id: String(typedLesson.id ?? ""),
                title: String(typedLesson.title ?? ""),
                contentType: (String(typedLesson.content_type ?? typedLesson.type ?? "video") as TeacherLessonContentType),
                videoUrl: String(typedLesson.video_url ?? typedLesson.videoUrl ?? ""),
                textContent: String(typedLesson.text_content ?? typedLesson.textContent ?? ""),
              };
            })
          : [],
        tasks: Array.isArray(typedSection.tasks)
          ? typedSection.tasks.map((task) => {
              const typedTask = task as Record<string, unknown>;
              const submissionType = String(typedTask.submission_type ?? typedTask.submissionType ?? "text_submission");
              return {
                id: String(typedTask.id ?? ""),
                title: String(typedTask.title ?? ""),
                instructions: String(typedTask.instructions ?? ""),
                submissionType:
                  submissionType === "file_upload" ? "file-upload" : "text-submission",
                resourceLinks: Array.isArray(typedTask.resource_links ?? typedTask.resourceLinks)
                  ? (typedTask.resource_links ?? typedTask.resourceLinks).map((link: unknown) => String(link))
                  : [],
              };
            })
          : [],
      };
    }),
    analytics: {
      views: Number(analytics.views ?? 0),
      enrollments: Number(analytics.enrollments ?? 0),
      completionRate: Number(analytics.completionRate ?? 0),
    },
    lastUpdated: String(raw.lastUpdated ?? raw.updated_at ?? new Date().toISOString()),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeActivity(raw: Record<string, unknown>): TeacherActivity {
  return {
    id: String(raw.id ?? ""),
    message: String(raw.message ?? ""),
    timestamp: String(raw.timestamp ?? raw.created_at ?? new Date().toISOString()),
    createdAt: String(raw.created_at ?? raw.timestamp ?? new Date().toISOString()),
    type: String(raw.type ?? "edit-course") as TeacherActivityType,
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function useTeacherPlatform(enabled = true) {
  const { refreshCurrentUser } = useAuth();
  const [profile, setProfile] = useState<TeacherProfileSettings>({
    displayName: "",
    email: "",
    program: "",
    track: "",
  });
  const [stats, setStats] = useState<TeacherDashboardStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    activeCourses: 0,
    totalLearners: 0,
  });
  const [categories, setCategories] = useState<TeacherCategory[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    const [dashboardResult, categoriesResult, coursesResult, activitiesResult] = await Promise.allSettled([
      authenticatedRequest<TeacherDashboardPayload>("/api/dashboard/teacher/"),
      authenticatedRequest<unknown>("/api/admin/categories/"),
      authenticatedRequest<unknown>("/api/teacher/courses/"),
      authenticatedRequest<unknown>("/api/teacher/activities/"),
    ]);

    const failures: string[] = [];

    if (dashboardResult.status === "fulfilled") {
      setProfile({
        displayName: dashboardResult.value.teacher.displayName,
        email: dashboardResult.value.teacher.email,
        program: dashboardResult.value.teacher.program,
        track: dashboardResult.value.teacher.track,
      });
      setStats(dashboardResult.value.stats);
      setActivities(normalizeListPayload<Record<string, unknown>>(dashboardResult.value.recentActivities).map(normalizeActivity));
      if (Array.isArray(dashboardResult.value.recentCourses)) {
        setTeacherCourses(dashboardResult.value.recentCourses.map((course) => normalizeCourse(course as Record<string, unknown>)));
      }
    } else {
      failures.push(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Teacher dashboard failed to load.");
    }

    if (categoriesResult.status === "fulfilled") {
      setCategories(normalizeListPayload<Record<string, unknown>>(categoriesResult.value).map(normalizeCategory));
    } else {
      failures.push(categoriesResult.reason instanceof Error ? categoriesResult.reason.message : "Categories failed to load.");
    }

    if (coursesResult.status === "fulfilled") {
      setTeacherCourses(normalizeListPayload<Record<string, unknown>>(coursesResult.value).map(normalizeCourse));
    } else {
      failures.push(coursesResult.reason instanceof Error ? coursesResult.reason.message : "Courses failed to load.");
    }

    if (activitiesResult.status === "fulfilled") {
      setActivities(normalizeListPayload<Record<string, unknown>>(activitiesResult.value).map(normalizeActivity));
    } else {
      failures.push(activitiesResult.reason instanceof Error ? activitiesResult.reason.message : "Activities failed to load.");
    }

    setError(failures.join(" | "));
    setIsLoading(false);
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const allowedCategories = useMemo(() => {
    const matching = categories.filter((category) => category.name === profile.program || category.program === profile.program);
    return matching.length ? matching : categories;
  }, [categories, profile.program]);

  const allowedTracks = useMemo(() => {
    const tracks = allowedCategories.flatMap((category) => category.subcategories.map((subcategory) => subcategory.name));
    const uniqueTracks = Array.from(new Set(tracks));
    return uniqueTracks.length ? uniqueTracks : profile.track ? [profile.track] : [];
  }, [allowedCategories, profile.track]);

  const buildEmptyCourse = useCallback((): TeacherCourse => {
    const category = allowedCategories[0];
    const subcategory = category?.subcategories[0];
    return {
      id: createLocalId("course"),
      teacherId: "self",
      title: "",
      subtitle: "",
      categoryId: category?.id ?? "",
      subcategoryId: subcategory?.id ?? "",
      program: category?.name ?? profile.program,
      track: subcategory?.name ?? profile.track,
      tags: [],
      roadmapLink: "",
      overview: "",
      schemeOfWork: "",
      price: 0,
      status: "draft",
      visibility: "hidden",
      sections: [
        {
          id: createLocalId("section"),
          title: "Section 1",
          description: "",
          accessType: "free",
          collapsed: false,
          lessons: [
            {
              id: createLocalId("lesson"),
              title: "",
              contentType: "video",
              videoUrl: "",
              textContent: "",
            },
          ],
          tasks: [],
        },
      ],
      analytics: {
        views: 0,
        enrollments: 0,
        completionRate: 0,
      },
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }, [allowedCategories, profile.program, profile.track]);

  const getCourseById = useCallback((id: string) => teacherCourses.find((course) => course.id === id), [teacherCourses]);

  const validateCourse = useCallback((course: TeacherCourse) => {
    const issues: string[] = [];
    if (!course.title.trim()) issues.push("Course title is required.");
    if (!course.subtitle.trim()) issues.push("Course subtitle is required.");
    if (!course.categoryId) issues.push("Category is required.");
    if (!course.subcategoryId) issues.push("Subcategory is required.");
    if (!stripHtml(course.overview)) issues.push("Course overview is required.");
    if (!course.sections.length) issues.push("At least one section is required.");

    course.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) issues.push(`Section ${sectionIndex + 1} needs a title.`);
      if (!section.lessons.length) issues.push(`Section ${sectionIndex + 1} needs at least one lesson.`);
      section.lessons.forEach((lesson, lessonIndex) => {
        if (!lesson.title.trim()) {
          issues.push(`Lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs a title.`);
        }
        if (lesson.contentType === "video" && !lesson.videoUrl.trim()) {
          issues.push(`Video lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs a video URL.`);
        }
        if (lesson.contentType === "text" && !stripHtml(lesson.textContent)) {
          issues.push(`Text lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs content.`);
        }
      });
    });

    return issues;
  }, []);

  const recordActivity = useCallback(
    async (message: string, type: TeacherActivityType, courseId?: string) => {
      const activity = await authenticatedRequest<Record<string, unknown>>("/api/teacher/activities/", {
        method: "POST",
        body: JSON.stringify({ message, type, courseId }),
      });
      setActivities((current) => [normalizeActivity(activity), ...current]);
    },
    [],
  );

  const clearTeacherActivities = useCallback(async () => {
    await authenticatedRequest("/api/teacher/activities/", { method: "DELETE" });
    setActivities([]);
  }, []);

  const syncSections = useCallback(async (courseId: string, nextCourse: TeacherCourse, previousCourse?: TeacherCourse) => {
    const previousSections = previousCourse?.sections ?? [];
    const existingSectionIds = new Set(previousSections.map((section) => section.id));
    const nextSectionIds = new Set<string>();

    for (const [sectionIndex, section] of nextCourse.sections.entries()) {
      const sectionPayload = {
        title: section.title,
        description: section.description,
        order: sectionIndex + 1,
        access_type: section.accessType,
        is_published: true,
      };

      let savedSectionId = section.id;
      if (!existingSectionIds.has(section.id)) {
        const created = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/courses/${courseId}/sections/`, {
          method: "POST",
          body: JSON.stringify(sectionPayload),
        });
        savedSectionId = String(created.id);
      } else {
        await authenticatedRequest(`/api/teacher/sections/${section.id}/`, {
          method: "PATCH",
          body: JSON.stringify(sectionPayload),
        });
      }
      nextSectionIds.add(savedSectionId);

      const previousSection = previousSections.find((item) => item.id === section.id);
      const previousLessons = previousSection?.lessons ?? [];
      const previousTasks = previousSection?.tasks ?? [];
      const previousLessonIds = new Set(previousLessons.map((lesson) => lesson.id));
      const previousTaskIds = new Set(previousTasks.map((task) => task.id));
      const nextLessonIds = new Set<string>();
      const nextTaskIds = new Set<string>();

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        const lessonPayload = {
          title: lesson.title,
          content_type: lesson.contentType,
          video_url: lesson.videoUrl,
          text_content: lesson.textContent,
          duration_minutes: 0,
          order: lessonIndex + 1,
          is_previewable: lessonIndex === 0,
          is_published: true,
        };

        let savedLessonId = lesson.id;
        if (!previousLessonIds.has(lesson.id)) {
          const createdLesson = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/sections/${savedSectionId}/lessons/`, {
            method: "POST",
            body: JSON.stringify(lessonPayload),
          });
          savedLessonId = String(createdLesson.id);
        } else {
          await authenticatedRequest(`/api/teacher/lessons/${lesson.id}/`, {
            method: "PATCH",
            body: JSON.stringify(lessonPayload),
          });
        }
        nextLessonIds.add(savedLessonId);
      }

      for (const previousLesson of previousLessons) {
        if (!nextLessonIds.has(previousLesson.id)) {
          await authenticatedRequest(`/api/teacher/lessons/${previousLesson.id}/`, { method: "DELETE" });
        }
      }

      for (const [taskIndex, task] of section.tasks.entries()) {
        const taskPayload = {
          title: task.title,
          instructions: task.instructions,
          submission_type: task.submissionType,
          resource_links: task.resourceLinks,
          order: taskIndex + 1,
          is_required: false,
        };

        let savedTaskId = task.id;
        if (!previousTaskIds.has(task.id)) {
          const createdTask = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/sections/${savedSectionId}/tasks/`, {
            method: "POST",
            body: JSON.stringify(taskPayload),
          });
          savedTaskId = String(createdTask.id);
        } else {
          await authenticatedRequest(`/api/teacher/tasks/${task.id}/`, {
            method: "PATCH",
            body: JSON.stringify(taskPayload),
          });
        }
        nextTaskIds.add(savedTaskId);
      }

      for (const previousTask of previousTasks) {
        if (!nextTaskIds.has(previousTask.id)) {
          await authenticatedRequest(`/api/teacher/tasks/${previousTask.id}/`, { method: "DELETE" });
        }
      }
    }

    for (const previousSection of previousSections) {
      if (!nextSectionIds.has(previousSection.id)) {
        await authenticatedRequest(`/api/teacher/sections/${previousSection.id}/`, { method: "DELETE" });
      }
    }
  }, []);

  const saveCourse = useCallback(
    async (course: TeacherCourse, intent: "draft" | "publish" | "unpublish", options?: { autosave?: boolean }) => {
      const issues = validateCourse(course);
      if (intent === "publish" && issues.length) {
        return { ok: false, course, issues };
      }

      const previousCourse = getCourseById(course.id);
      const payload = {
        title: course.title,
        subtitle: course.subtitle,
        category: course.categoryId,
        subcategory: course.subcategoryId,
        overview: course.overview,
        scheme_of_work: course.schemeOfWork,
        roadmap_link: course.roadmapLink,
        price: course.price,
        status: intent === "publish" ? "draft" : intent === "unpublish" ? "draft" : course.status,
        visibility: intent === "publish" ? "hidden" : course.visibility,
        tags: course.tags,
      };

      let saved = previousCourse
        ? await authenticatedRequest<Record<string, unknown>>(`/api/teacher/courses/${course.id}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await authenticatedRequest<Record<string, unknown>>("/api/teacher/courses/", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      await syncSections(String(saved.id), course, previousCourse);

      if (intent === "publish") {
        saved = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/courses/${saved.id}/publish/`, {
          method: "POST",
        });
      } else if (intent === "unpublish") {
        saved = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/courses/${saved.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "draft", visibility: "hidden" }),
        });
      } else {
        saved = await authenticatedRequest<Record<string, unknown>>(`/api/teacher/courses/${saved.id}/`, {
          method: "GET",
        });
      }

      const normalized = normalizeCourse(saved);
      setTeacherCourses((current) => {
        const withoutCurrent = current.filter((item) => item.id !== normalized.id);
        return [normalized, ...withoutCurrent];
      });

      const activityType: TeacherActivityType =
        intent === "publish"
          ? "publish-course"
          : intent === "unpublish"
            ? "unpublish-course"
            : options?.autosave
              ? "save-draft"
              : previousCourse
                ? "edit-course"
                : "create-course";

      await recordActivity(
        intent === "publish"
          ? `Published course ${normalized.title}`
          : intent === "unpublish"
            ? `Moved course ${normalized.title} back to draft`
            : previousCourse
              ? `Updated course ${normalized.title}`
              : `Created course ${normalized.title || "Untitled course"}`,
        activityType,
        normalized.id,
      );

      return { ok: true, course: normalized, issues };
    },
    [getCourseById, recordActivity, syncSections, validateCourse],
  );

  const deleteCourse = useCallback(
    async (courseId: string) => {
      const course = getCourseById(courseId);
      await authenticatedRequest(`/api/teacher/courses/${courseId}/`, { method: "DELETE" });
      setTeacherCourses((current) => current.filter((item) => item.id !== courseId));
      if (course) {
        await recordActivity(`Deleted course ${course.title}`, "delete-course", courseId);
      }
    },
    [getCourseById, recordActivity],
  );

  const updateProfile = useCallback(
    async (patch: Partial<TeacherProfileSettings>) => {
      const payload: Record<string, unknown> = {};
      if (typeof patch.displayName === "string") payload.displayName = patch.displayName;
      if (typeof patch.program === "string") payload.selectedInterest = patch.program;
      if (typeof patch.track === "string") payload.selectedTrack = patch.track;
      const updatedUser = await authenticatedRequest<Record<string, unknown>>("/api/auth/me/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshCurrentUser();
      setProfile((current) => ({
        displayName: String(updatedUser.displayName ?? current.displayName),
        email: String(updatedUser.email ?? current.email),
        program: String(updatedUser.selectedInterest ?? current.program),
        track: String(updatedUser.selectedTrack ?? current.track),
      }));
      await recordActivity("Updated teacher profile settings", "settings-update");
    },
    [recordActivity, refreshCurrentUser],
  );

  const changePassword = useCallback(async (currentPassword: string, nextPassword: string) => {
    await authenticatedRequest("/api/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: nextPassword,
      }),
    });
  }, []);

  return {
    profile,
    stats,
    activities,
    teacherCourses,
    categories,
    allowedCategories,
    allowedTracks,
    isLoading,
    error,
    reload: load,
    buildEmptyCourse,
    getCourseById,
    saveCourse,
    deleteCourse,
    validateCourse,
    recordActivity,
    clearTeacherActivities,
    updateProfile,
    changePassword,
  };
}
