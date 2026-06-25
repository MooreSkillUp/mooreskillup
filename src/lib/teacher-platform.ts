import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isSupportedEmbeddedVideoUrl } from "@/lib/video";
import {
  authenticatedRequest,
  normalizeListPayload,
} from "@/lib/authenticated-api";


export type TeacherCourseStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "declined"
  | "archived";
export type TeacherCourseVisibility = "visible" | "hidden";
export type TeacherCourseLevel = "beginner" | "intermediate" | "advanced";
export type TeacherSectionAccess = "free" | "paid";
export type TeacherLessonContentType = "video" | "text" | "resource";
export type TeacherTaskSubmissionType = "whatsapp-group" | "google-form" | "external-link";
export type TeacherResourceType =
  | "pdf"
  | "documentation"
  | "github"
  | "google_drive"
  | "zip"
  | "website";
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

export interface TeacherResourceLink {
  type: TeacherResourceType;
  title: string;
  url: string;
}

export interface TeacherLesson {
  id: string;
  title: string;
  contentType: TeacherLessonContentType;
  videoUrl: string;
  textContent: string;
  resourceLinks: TeacherResourceLink[];
  tags: string[];
  embedUrl?: string;
}

/** An assignment. Submission happens off-platform via a link (no uploads/grading). */
export interface TeacherTask {
  id: string;
  title: string;
  instructions: string;
  submissionType: TeacherTaskSubmissionType;
  submissionUrl: string;
  howToSubmit: string;
  dueDate?: string | null;
}

export interface TeacherProject {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deliverables: string;
  submissionUrl: string;
  howToSubmit: string;
}

export interface TeacherSection {
  id: string;
  title: string;
  description: string;
  accessType: TeacherSectionAccess;
  collapsed: boolean;
  lessons: TeacherLesson[];
  tasks: TeacherTask[];
  projects: TeacherProject[];
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
  level: TeacherCourseLevel;
  price: number;
  discountPrice: number | null;
  metaTitle: string;
  metaDescription: string;
  techStack: string[];
  certificateEnabled: boolean;
  pendingDeletion: boolean;
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

export interface TeacherCourseVersion {
  id: string;
  versionNumber: number;
  note: string;
  createdBy: string | null;
  createdAt: string;
  sectionCount: number;
}

export interface TeacherProfileSettings {
  displayName: string;
  email: string;
  program: string;
  track: string;
  tracks: string[];
}

export interface TeacherDashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  activeCourses: number;
  totalLearners: number;
  pendingReviewCourses: number;
  declinedCourses: number;
  approvedCourses: number;
  completionRate: number;
  totalViews: number;
}

interface TeacherDashboardPayload {
  announcementsEnabled?: boolean;
  teacher: {
    id: string;
    displayName: string;
    email: string;
    program: string;
    track: string;
    tracks?: string[];
  };
  stats: TeacherDashboardStats;
  recentActivities?: unknown;
  recentCourses?: unknown;
}

interface AdminEditorDashboardPayload {
  announcementsEnabled?: boolean;
  teacher: TeacherDashboardPayload["teacher"];
  stats: TeacherDashboardStats;
  recentActivities?: unknown;
  recentCourses?: unknown;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
    level: (String(raw.level ?? "beginner") as TeacherCourseLevel),
    price: Number(raw.price ?? 0),
    discountPrice:
      raw.discountPrice ?? raw.discount_price ?? null
        ? Number(raw.discountPrice ?? raw.discount_price)
        : null,
    metaTitle: String(raw.metaTitle ?? raw.meta_title ?? ""),
    metaDescription: String(raw.metaDescription ?? raw.meta_description ?? ""),
    techStack: Array.isArray(raw.techStack)
      ? raw.techStack.map((item) => String(item))
      : Array.isArray(raw.tech_stack)
        ? (raw.tech_stack as unknown[]).map((item) => String(item))
        : [],
    certificateEnabled: Boolean(raw.certificateEnabled ?? raw.certificate_enabled ?? false),
    pendingDeletion: Boolean(raw.pendingDeletion ?? raw.pending_deletion ?? false),
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
              const rawResources = typedLesson.resourceLinks ?? typedLesson.resource_links;
              return {
                id: String(typedLesson.id ?? ""),
                title: String(typedLesson.title ?? ""),
                contentType: (String(typedLesson.content_type ?? typedLesson.type ?? "video") as TeacherLessonContentType),
                videoUrl: String(typedLesson.video_url ?? typedLesson.videoUrl ?? ""),
                textContent: String(typedLesson.text_content ?? typedLesson.textContent ?? ""),
                resourceLinks: Array.isArray(rawResources)
                  ? rawResources.map((link) => {
                      const typed = link as Record<string, unknown>;
                      return {
                        type: (String(typed.type ?? "website") as TeacherResourceType),
                        title: String(typed.title ?? ""),
                        url: String(typed.url ?? ""),
                      };
                    })
                  : [],
                tags: Array.isArray(typedLesson.tags) ? typedLesson.tags.map((tag: unknown) => String(tag)) : [],
                embedUrl: String(typedLesson.embedUrl ?? ""),
              };
            })
          : [],
        tasks: Array.isArray(typedSection.tasks)
          ? typedSection.tasks.map((task) => {
              const typedTask = task as Record<string, unknown>;
              const submissionType = String(
                typedTask.submissionType ?? typedTask.submission_type ?? "whatsapp_group",
              ).replace(/_/g, "-");
              const normalizedType: TeacherTaskSubmissionType =
                submissionType === "google-form"
                  ? "google-form"
                  : submissionType === "external-link"
                    ? "external-link"
                    : "whatsapp-group";
              return {
                id: String(typedTask.id ?? ""),
                title: String(typedTask.title ?? ""),
                instructions: String(typedTask.instructions ?? ""),
                submissionType: normalizedType,
                submissionUrl: String(typedTask.submissionUrl ?? typedTask.submission_url ?? ""),
                howToSubmit: String(typedTask.howToSubmit ?? typedTask.how_to_submit ?? ""),
                dueDate: (typedTask.dueDate ?? typedTask.due_date ?? null) as string | null,
              };
            })
          : [],
        projects: Array.isArray(typedSection.projects)
          ? typedSection.projects.map((project) => {
              const typed = project as Record<string, unknown>;
              return {
                id: String(typed.id ?? ""),
                title: String(typed.title ?? ""),
                description: String(typed.description ?? ""),
                requirements: String(typed.requirements ?? ""),
                deliverables: String(typed.deliverables ?? ""),
                submissionUrl: String(typed.submissionUrl ?? typed.submission_url ?? ""),
                howToSubmit: String(typed.howToSubmit ?? typed.how_to_submit ?? ""),
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

function getInheritedCategory(categories: TeacherCategory[], program: string) {
  return categories.find((category) => category.name === program || category.program === program) ?? categories[0];
}

function getInheritedTrack(category: TeacherCategory | undefined, track: string) {
  return category?.subcategories.find((subcategory) => subcategory.name === track) ?? category?.subcategories[0];
}

function getCategoryForTrack(categories: TeacherCategory[], program: string, track: string) {
  const matchingProgramCategories = categories.filter(
    (category) => category.name === program || category.program === program,
  );
  const scopedCategories = matchingProgramCategories.length ? matchingProgramCategories : categories;
  return (
    scopedCategories.find((category) =>
      category.subcategories.some((subcategory) => subcategory.name === track),
    ) ?? scopedCategories[0]
  );
}

export function useTeacherPlatform(
  options?: {
    enabled?: boolean;
    platformMode?: "teacher" | "admin-owned";
    courseId?: string;
  },
) {
  const enabled = options?.enabled ?? true;
  const platformMode = options?.platformMode ?? "teacher";
  const adminCourseId = options?.courseId;
  const { refreshCurrentUser, user } = useAuth();
  const isAdminOwnedMode = platformMode === "admin-owned" && user?.role === "admin";
  const [profile, setProfile] = useState<TeacherProfileSettings>({
    displayName: "",
    email: "",
    program: "",
    track: "",
    tracks: [],
  });
  const [stats, setStats] = useState<TeacherDashboardStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    activeCourses: 0,
    totalLearners: 0,
    pendingReviewCourses: 0,
    declinedCourses: 0,
    approvedCourses: 0,
    completionRate: 0,
    totalViews: 0,
  });
  const [categories, setCategories] = useState<TeacherCategory[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    const [dashboardResult, categoriesResult, coursesResult, activitiesResult] = isAdminOwnedMode
      ? await Promise.allSettled([
          Promise.resolve<AdminEditorDashboardPayload>({
            teacher: {
              id: "admin-owned",
              displayName: "Admin-owned course",
              email: user?.email ?? "",
              program: "",
              track: "",
            },
            stats: {
              totalCourses: 0,
              publishedCourses: 0,
              draftCourses: 0,
              activeCourses: 0,
              totalLearners: 0,
              pendingReviewCourses: 0,
              declinedCourses: 0,
              approvedCourses: 0,
              completionRate: 0,
              totalViews: 0,
            },
          }),
          authenticatedRequest<unknown>("/api/admin/categories/"),
          adminCourseId
            ? authenticatedRequest<Record<string, unknown>>(`/api/admin/courses/${adminCourseId}/`)
            : Promise.resolve<Record<string, unknown> | null>(null),
          Promise.resolve<unknown>([]),
        ])
      : await Promise.allSettled([
          authenticatedRequest<TeacherDashboardPayload>("/api/dashboard/teacher/"),
          authenticatedRequest<unknown>("/api/categories/"),
          authenticatedRequest<unknown>("/api/teacher/courses/"),
          authenticatedRequest<unknown>("/api/teacher/activities/"),
        ]);

    const failures: string[] = [];

    if (dashboardResult.status === "fulfilled") {
      setAnnouncementsEnabled(Boolean(dashboardResult.value.announcementsEnabled));
      setProfile({
        displayName: isAdminOwnedMode ? "Admin workspace" : dashboardResult.value.teacher.displayName,
        email: user?.email ?? dashboardResult.value.teacher.email,
        program: dashboardResult.value.teacher.program,
        track: dashboardResult.value.teacher.track,
        tracks: dashboardResult.value.teacher.tracks ?? (dashboardResult.value.teacher.track ? [dashboardResult.value.teacher.track] : []),
      });
      setStats(dashboardResult.value.stats);
      setActivities(
        isAdminOwnedMode
          ? []
          : normalizeListPayload<Record<string, unknown>>(dashboardResult.value.recentActivities).map(normalizeActivity),
      );
      if (!isAdminOwnedMode && Array.isArray(dashboardResult.value.recentCourses)) {
        setTeacherCourses(
          dashboardResult.value.recentCourses.map((course: unknown) =>
            normalizeCourse(course as Record<string, unknown>),
          ),
        );
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
      if (isAdminOwnedMode) {
        const adminCourse = coursesResult.value ? normalizeCourse(coursesResult.value as Record<string, unknown>) : null;
        setTeacherCourses(adminCourse ? [adminCourse] : []);
        if (adminCourse) {
          setProfile((current) => ({
            ...current,
            program: adminCourse.program,
            track: adminCourse.track,
            tracks: adminCourse.track ? [adminCourse.track] : [],
          }));
        }
      } else {
        setTeacherCourses(normalizeListPayload<Record<string, unknown>>(coursesResult.value).map(normalizeCourse));
      }
    } else {
      failures.push(coursesResult.reason instanceof Error ? coursesResult.reason.message : "Courses failed to load.");
    }

    if (activitiesResult.status === "fulfilled") {
      setActivities(
        isAdminOwnedMode
          ? []
          : normalizeListPayload<Record<string, unknown>>(activitiesResult.value).map(normalizeActivity),
      );
    } else {
      failures.push(activitiesResult.reason instanceof Error ? activitiesResult.reason.message : "Activities failed to load.");
    }

    setError(failures.join(" | "));
    setIsLoading(false);
  }, [adminCourseId, enabled, isAdminOwnedMode, user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const allowedCategories = useMemo(() => {
    if (isAdminOwnedMode) return categories;
    const matching = categories.filter((category) => category.name === profile.program || category.program === profile.program);
    return matching.length ? matching : categories;
  }, [categories, isAdminOwnedMode, profile.program]);

  const allowedTracks = useMemo(() => {
    const allowedTrackSet = new Set(profile.tracks.length ? profile.tracks : profile.track ? [profile.track] : []);
    const tracks = allowedCategories.flatMap((category) =>
      category.subcategories
        .map((subcategory) => subcategory.name)
        .filter((track) => !allowedTrackSet.size || allowedTrackSet.has(track)),
    );
    const uniqueTracks = Array.from(new Set(tracks));
    return uniqueTracks.length ? uniqueTracks : profile.tracks.length ? profile.tracks : profile.track ? [profile.track] : [];
  }, [allowedCategories, profile.track, profile.tracks]);

  const buildEmptyCourse = useCallback((): TeacherCourse => {
    const category = getInheritedCategory(allowedCategories, profile.program);
    const preferredTrack = profile.tracks[0] ?? profile.track;
    const subcategory = getInheritedTrack(category, preferredTrack);
    return {
      id: createLocalId("course"),
      teacherId: "self",
      title: "",
      subtitle: "",
      categoryId: category?.id ?? "",
      subcategoryId: subcategory?.id ?? "",
      program: category?.name ?? profile.program,
      track: subcategory?.name ?? preferredTrack,
      tags: [],
      roadmapLink: "",
      overview: "",
      schemeOfWork: "",
      level: "beginner",
      price: 0,
      discountPrice: null,
      metaTitle: "",
      metaDescription: "",
      techStack: [],
      certificateEnabled: false,
      pendingDeletion: false,
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
              resourceLinks: [],
              tags: [],
            },
          ],
          tasks: [],
          projects: [],
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
  }, [allowedCategories, profile.program, profile.track, profile.tracks]);

  const getCourseById = useCallback((id: string) => teacherCourses.find((course) => course.id === id), [teacherCourses]);

  const syncCourseClassification = useCallback(
    (course: TeacherCourse): TeacherCourse => {
      const selectedTrack = course.track || profile.tracks[0] || profile.track;
      const category = getCategoryForTrack(allowedCategories, profile.program, selectedTrack);
      const subcategory = getInheritedTrack(category, selectedTrack);

      return {
        ...course,
        program: category?.name ?? profile.program,
        categoryId: category?.id ?? course.categoryId,
        track: subcategory?.name ?? selectedTrack,
        subcategoryId: subcategory?.id ?? course.subcategoryId,
      };
    },
    [allowedCategories, profile.program, profile.track, profile.tracks],
  );

  const validateCourse = useCallback((course: TeacherCourse) => {
    const normalizedCourse = syncCourseClassification(course);
    const issues: string[] = [];
    if (!normalizedCourse.title.trim()) issues.push("Course title is required.");
    if (!normalizedCourse.subtitle.trim()) issues.push("Course subtitle is required.");
    if (!normalizedCourse.categoryId) issues.push("Program is required.");
    if (!normalizedCourse.subcategoryId) issues.push("Track is required.");
    if (!stripHtml(normalizedCourse.overview)) issues.push("Course overview is required.");
    if (!normalizedCourse.sections.length) issues.push("At least one section is required.");

    normalizedCourse.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) issues.push(`Section ${sectionIndex + 1} needs a title.`);
      if (!section.lessons.length) issues.push(`Section ${sectionIndex + 1} needs at least one lesson.`);
      section.lessons.forEach((lesson, lessonIndex) => {
        if (!lesson.title.trim()) {
          issues.push(`Lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs a title.`);
        }
        if (lesson.contentType === "video" && !lesson.videoUrl.trim()) {
          issues.push(`Video lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs a video URL.`);
        }
        if (lesson.contentType === "video" && lesson.videoUrl.trim() && !isSupportedEmbeddedVideoUrl(lesson.videoUrl)) {
          issues.push(
            `Video lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs a valid YouTube, Vimeo, or direct video file URL.`,
          );
        }
        if (lesson.contentType === "text" && !stripHtml(lesson.textContent)) {
          issues.push(`Text lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs content.`);
        }
        if (lesson.contentType === "resource" && !lesson.resourceLinks.some((link) => link.url.trim())) {
          issues.push(`Resource lesson ${lessonIndex + 1} in section ${sectionIndex + 1} needs at least one link.`);
        }
      });

      section.tasks.forEach((task, taskIndex) => {
        if (task.title.trim() && !task.submissionUrl.trim()) {
          issues.push(`Assignment ${taskIndex + 1} in section ${sectionIndex + 1} needs a submission link.`);
        }
      });
    });

    if (normalizedCourse.price > 0 && normalizedCourse.discountPrice !== null && normalizedCourse.discountPrice >= normalizedCourse.price) {
      issues.push("Discount price must be lower than the regular price.");
    }

    return issues;
  }, [syncCourseClassification]);

  const recordActivity = useCallback(
    async (message: string, type: TeacherActivityType, courseId?: string) => {
      if (isAdminOwnedMode) return;
      const activity = await authenticatedRequest<Record<string, unknown>>("/api/teacher/activities/", {
        method: "POST",
        body: JSON.stringify({ message, type, courseId }),
      });
      setActivities((current) => [normalizeActivity(activity), ...current]);
    },
    [isAdminOwnedMode],
  );

  const clearTeacherActivities = useCallback(async () => {
    if (isAdminOwnedMode) {
      setActivities([]);
      return;
    }
    await authenticatedRequest("/api/teacher/activities/", { method: "DELETE" });
    setActivities([]);
  }, [isAdminOwnedMode]);

  const endpoints = useMemo(
    () =>
      isAdminOwnedMode
        ? {
            courseCollection: "/api/admin/courses/",
            courseDetail: (id: string) => `/api/admin/courses/${id}/`,
            publishCourse: (id: string) => `/api/admin/courses/${id}/publish/`,
            createSection: (id: string) => `/api/admin/courses/${id}/sections/`,
            sectionDetail: (id: string) => `/api/admin/sections/${id}/`,
            createLesson: (id: string) => `/api/admin/sections/${id}/lessons/`,
            lessonDetail: (id: string) => `/api/admin/lessons/${id}/`,
            createTask: (id: string) => `/api/admin/sections/${id}/tasks/`,
            taskDetail: (id: string) => `/api/admin/tasks/${id}/`,
            createProject: (id: string) => `/api/admin/sections/${id}/projects/`,
            projectDetail: (id: string) => `/api/admin/projects/${id}/`,
          }
        : {
            courseCollection: "/api/teacher/courses/",
            courseDetail: (id: string) => `/api/teacher/courses/${id}/`,
            publishCourse: (id: string) => `/api/teacher/courses/${id}/publish/`,
            createSection: (id: string) => `/api/teacher/courses/${id}/sections/`,
            sectionDetail: (id: string) => `/api/teacher/sections/${id}/`,
            createLesson: (id: string) => `/api/teacher/sections/${id}/lessons/`,
            lessonDetail: (id: string) => `/api/teacher/lessons/${id}/`,
            createTask: (id: string) => `/api/teacher/sections/${id}/tasks/`,
            taskDetail: (id: string) => `/api/teacher/tasks/${id}/`,
            createProject: (id: string) => `/api/teacher/sections/${id}/projects/`,
            projectDetail: (id: string) => `/api/teacher/projects/${id}/`,
          },
    [isAdminOwnedMode],
  );

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
        const created = await authenticatedRequest<Record<string, unknown>>(endpoints.createSection(courseId), {
          method: "POST",
          body: JSON.stringify(sectionPayload),
        });
        savedSectionId = String(created.id);
      } else {
        await authenticatedRequest(endpoints.sectionDetail(section.id), {
          method: "PATCH",
          body: JSON.stringify(sectionPayload),
        });
      }
      nextSectionIds.add(savedSectionId);

      const previousSection = previousSections.find((item) => item.id === section.id);
      const previousLessons = previousSection?.lessons ?? [];
      const previousTasks = previousSection?.tasks ?? [];
      const previousProjects = previousSection?.projects ?? [];
      const previousLessonIds = new Set(previousLessons.map((lesson) => lesson.id));
      const previousTaskIds = new Set(previousTasks.map((task) => task.id));
      const previousProjectIds = new Set(previousProjects.map((project) => project.id));
      const nextLessonIds = new Set<string>();
      const nextTaskIds = new Set<string>();
      const nextProjectIds = new Set<string>();

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        const lessonPayload = {
          title: lesson.title,
          content_type: lesson.contentType,
          video_url: lesson.contentType === "video" ? lesson.videoUrl : "",
          text_content: lesson.contentType === "text" ? lesson.textContent : "",
          resourceLinks: lesson.contentType === "resource" ? lesson.resourceLinks : [],
          tags: lesson.tags,
          duration_minutes: 0,
          order: lessonIndex + 1,
          is_previewable: lessonIndex === 0,
          is_published: true,
        };

        let savedLessonId = lesson.id;
        if (!previousLessonIds.has(lesson.id)) {
          const createdLesson = await authenticatedRequest<Record<string, unknown>>(endpoints.createLesson(savedSectionId), {
            method: "POST",
            body: JSON.stringify(lessonPayload),
          });
          savedLessonId = String(createdLesson.id);
        } else {
          await authenticatedRequest(endpoints.lessonDetail(lesson.id), {
            method: "PATCH",
            body: JSON.stringify(lessonPayload),
          });
        }
        nextLessonIds.add(savedLessonId);
      }

      for (const previousLesson of previousLessons) {
        if (!nextLessonIds.has(previousLesson.id)) {
          await authenticatedRequest(endpoints.lessonDetail(previousLesson.id), { method: "DELETE" });
        }
      }

      for (const [taskIndex, task] of section.tasks.entries()) {
        const taskPayload = {
          title: task.title,
          instructions: task.instructions,
          submissionType: task.submissionType,
          submissionUrl: task.submissionUrl,
          howToSubmit: task.howToSubmit,
          dueDate: task.dueDate || null,
          order: taskIndex + 1,
          is_required: false,
        };

        let savedTaskId = task.id;
        if (!previousTaskIds.has(task.id)) {
          const createdTask = await authenticatedRequest<Record<string, unknown>>(endpoints.createTask(savedSectionId), {
            method: "POST",
            body: JSON.stringify(taskPayload),
          });
          savedTaskId = String(createdTask.id);
        } else {
          await authenticatedRequest(endpoints.taskDetail(task.id), {
            method: "PATCH",
            body: JSON.stringify(taskPayload),
          });
        }
        nextTaskIds.add(savedTaskId);
      }

      for (const previousTask of previousTasks) {
        if (!nextTaskIds.has(previousTask.id)) {
          await authenticatedRequest(endpoints.taskDetail(previousTask.id), { method: "DELETE" });
        }
      }

      // Projects (only when the endpoint set supports them).
      if (endpoints.createProject && endpoints.projectDetail) {
        for (const [projectIndex, project] of section.projects.entries()) {
          const projectPayload = {
            title: project.title,
            description: project.description,
            requirements: project.requirements,
            deliverables: project.deliverables,
            submissionUrl: project.submissionUrl,
            howToSubmit: project.howToSubmit,
            order: projectIndex + 1,
            is_required: false,
          };

          if (!previousProjectIds.has(project.id)) {
            await authenticatedRequest(endpoints.createProject(savedSectionId), {
              method: "POST",
              body: JSON.stringify(projectPayload),
            });
          } else {
            await authenticatedRequest(endpoints.projectDetail(project.id), {
              method: "PATCH",
              body: JSON.stringify(projectPayload),
            });
            nextProjectIds.add(project.id);
          }
        }

        for (const previousProject of previousProjects) {
          if (!nextProjectIds.has(previousProject.id)) {
            await authenticatedRequest(endpoints.projectDetail(previousProject.id), { method: "DELETE" });
          }
        }
      }
    }

    for (const previousSection of previousSections) {
      if (!nextSectionIds.has(previousSection.id)) {
        await authenticatedRequest(endpoints.sectionDetail(previousSection.id), { method: "DELETE" });
      }
    }
  }, [endpoints]);

  const saveCourse = useCallback(
    async (
      course: TeacherCourse,
      intent: "draft" | "publish" | "unpublish" | "archive" | "restore",
      options?: { autosave?: boolean },
    ) => {
      const nextCourse = syncCourseClassification(course);
      const issues = validateCourse(nextCourse);
      if (intent === "publish" && issues.length) {
        return { ok: false, course: nextCourse, issues };
      }

      const previousCourse = getCourseById(nextCourse.id);

      if (intent === "publish") {
        const currentStatus = previousCourse?.status ?? nextCourse.status;
        if (currentStatus === "review") {
          return {
            ok: false,
            course: nextCourse,
            issues: ["This course is already awaiting admin review."],
          };
        }
        if (currentStatus === "approved") {
          return {
            ok: false,
            course: nextCourse,
            issues: ["This course has been approved. An admin will publish it soon."],
          };
        }
        if (currentStatus === "published") {
          return {
            ok: false,
            course: nextCourse,
            issues: ["This course is already published. Use Unpublish to move it back to draft."],
          };
        }
      }

      // Guard: if categories haven't loaded yet, categoryId/subcategoryId will
      // be empty strings which the backend rejects. Fail loudly instead of
      // sending a guaranteed 400.
      if (!nextCourse.categoryId || !nextCourse.subcategoryId) {
        if (options?.autosave) return { ok: false, course: nextCourse, issues: [] };
        return {
          ok: false,
          course: nextCourse,
          issues: ["Course category and track are not loaded yet. Please wait a moment and try again."],
        };
      }

      const payload: Record<string, unknown> = {
        title: nextCourse.title,
        subtitle: nextCourse.subtitle,
        category: nextCourse.categoryId,
        subcategory: nextCourse.subcategoryId,
        overview: nextCourse.overview,
        scheme_of_work: nextCourse.schemeOfWork,
        level: nextCourse.level,
        price: nextCourse.price,
        discount_price: nextCourse.discountPrice,
        meta_title: nextCourse.metaTitle,
        meta_description: nextCourse.metaDescription,
        tech_stack: nextCourse.techStack,
        certificate_enabled: nextCourse.certificateEnabled,
        status:
          intent === "publish"
            ? "review"
            : intent === "unpublish" || intent === "restore"
              ? "draft"
              : intent === "archive"
                ? "archived"
                : nextCourse.status,
        visibility: intent === "publish" ? "hidden" : nextCourse.visibility,
        tags: nextCourse.tags,
      };
      // URLField on the backend rejects empty string — only send when non-empty.
      if (nextCourse.roadmapLink.trim()) {
        payload.roadmap_link = nextCourse.roadmapLink;
      }

      let saved: Record<string, unknown>;
      try {
        saved = previousCourse
          ? await authenticatedRequest<Record<string, unknown>>(endpoints.courseDetail(nextCourse.id), {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : await authenticatedRequest<Record<string, unknown>>(endpoints.courseCollection, {
              method: "POST",
              body: JSON.stringify(payload),
            });

        await syncSections(String(saved.id), nextCourse, previousCourse);

        if (intent === "publish") {
          saved = await authenticatedRequest<Record<string, unknown>>(endpoints.publishCourse(String(saved.id)), {
            method: "POST",
          });
        } else if (intent === "archive") {
          saved = await authenticatedRequest<Record<string, unknown>>(endpoints.courseDetail(String(saved.id)), {
            method: "PATCH",
            body: JSON.stringify({ status: "archived", visibility: "hidden" }),
          });
        } else if (intent === "unpublish") {
          saved = await authenticatedRequest<Record<string, unknown>>(endpoints.courseDetail(String(saved.id)), {
            method: "PATCH",
            body: JSON.stringify({ status: "draft", visibility: "hidden" }),
          });
        } else {
          saved = await authenticatedRequest<Record<string, unknown>>(endpoints.courseDetail(String(saved.id)), {
            method: "GET",
          });
        }
      } catch (error) {
        await load();
        throw new Error(
          error instanceof Error
            ? `Unable to save course changes safely: ${error.message}`
            : "Unable to save course changes safely.",
        );
      }

      const normalized = normalizeCourse(saved);
      setTeacherCourses((current) => {
        const withoutCurrent = current.filter((item) => item.id !== normalized.id);
        return [normalized, ...withoutCurrent];
      });

      const activityType: TeacherActivityType =
        intent === "publish"
          ? "publish-course"
          : intent === "archive"
            ? "unpublish-course"
          : intent === "unpublish"
            ? "unpublish-course"
            : options?.autosave
              ? "save-draft"
              : previousCourse
                ? "edit-course"
                : "create-course";

      await recordActivity(
        intent === "publish"
          ? `Submitted course ${normalized.title} for admin review`
          : intent === "archive"
            ? `Archived course ${normalized.title}`
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
    [endpoints, getCourseById, load, recordActivity, syncCourseClassification, syncSections, validateCourse],
  );

  const deleteCourse = useCallback(
    async (courseId: string) => {
      // Teachers can't delete directly — this sends a request to admin. The
      // course stays (flagged pendingDeletion) until an admin approves/aborts.
      await authenticatedRequest(endpoints.courseDetail(courseId), { method: "DELETE" });
      await load();
    },
    [endpoints, load],
  );

  const duplicateCourse = useCallback(
    async (courseId: string) => {
      const created = await authenticatedRequest<Record<string, unknown>>(
        `/api/teacher/courses/${courseId}/duplicate/`,
        { method: "POST" },
      );
      const normalized = normalizeCourse(created);
      setTeacherCourses((current) => [normalized, ...current]);
      return normalized;
    },
    [],
  );

  const fetchCourseVersions = useCallback(async (courseId: string) => {
    return authenticatedRequest<TeacherCourseVersion[]>(`/api/teacher/courses/${courseId}/versions/`);
  }, []);

  const sendAnnouncement = useCallback(
    async (input: { title: string; description: string; courseId?: string }) => {
      return authenticatedRequest<{ detail: string; recipients: number }>(
        "/api/teacher/announcements/",
        { method: "POST", body: JSON.stringify(input) },
      );
    },
    [],
  );

  const restoreCourseVersion = useCallback(
    async (courseId: string, versionId: string) => {
      const restored = await authenticatedRequest<Record<string, unknown>>(
        `/api/teacher/courses/${courseId}/versions/${versionId}/restore/`,
        { method: "POST" },
      );
      const normalized = normalizeCourse(restored);
      setTeacherCourses((current) => {
        const without = current.filter((item) => item.id !== normalized.id);
        return [normalized, ...without];
      });
      return normalized;
    },
    [],
  );

  const updateProfile = useCallback(
    async (patch: Partial<TeacherProfileSettings> & { avatarUrl?: string }) => {
      const payload: Record<string, unknown> = {};
      if (typeof patch.displayName === "string") payload.displayName = patch.displayName;
      if (typeof patch.program === "string") payload.selectedInterest = patch.program;
      if (typeof patch.track === "string") payload.selectedTrack = patch.track;
      if (typeof patch.avatarUrl === "string") payload.avatarUrl = patch.avatarUrl;
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
        tracks:
          Array.isArray(updatedUser.selectedTracks) && updatedUser.selectedTracks.length
            ? updatedUser.selectedTracks.map((track: unknown) => String(track))
            : current.tracks,
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
    await refreshCurrentUser();
  }, [refreshCurrentUser]);

  const archiveCourse = useCallback(async (courseId: string) => {
    const course = getCourseById(courseId);
    if (!course) return;
    await saveCourse({ ...course, status: "archived", visibility: "hidden" }, "archive");
  }, [getCourseById, saveCourse]);

  const restoreCourse = useCallback(async (courseId: string) => {
    const course = getCourseById(courseId);
    if (!course) return;
    await saveCourse({ ...course, status: "draft", visibility: "hidden" }, "restore");
  }, [getCourseById, saveCourse]);

  return {
    profile,
    stats,
    activities,
    teacherCourses,
    categories,
    allowedCategories,
    allowedTracks,
    announcementsEnabled,
    sendAnnouncement,
    isLoading,
    error,
    reload: load,
    buildEmptyCourse,
    getCourseById,
    saveCourse,
    archiveCourse,
    restoreCourse,
    deleteCourse,
    duplicateCourse,
    fetchCourseVersions,
    restoreCourseVersion,
    validateCourse,
    recordActivity,
    clearTeacherActivities,
    updateProfile,
    changePassword,
  };
}
