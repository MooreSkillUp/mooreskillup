import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_STORAGE_KEY = "mooreskillup.access-token";
const REFRESH_TOKEN_STORAGE_KEY = "mooreskillup.refresh-token";

export interface AdminTeacher {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  program: string;
  track: string;
  tracks: string[];
  academicProgram: string;
  academicTrack: string;
  academicTracks: string[];
  status: "active" | "inactive";
  temporaryPassword?: string | null;
}

export interface AdminSubcategory {
  id: string;
  categoryId?: string;
  name: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  program: string;
  subcategories: AdminSubcategory[];
}

export interface AdminCourse {
  id: string;
  title: string;
  price: string | number;
  status: string;
  visibility: string;
  category: string;
  subcategory: string;
  categoryId: string;
  subcategoryId: string;
  categoryName: string;
  subcategoryName: string;
  program: string;
  track: string;
  teacherId: string;
  teacherName: string;
  ownerType: "admin" | "teacher";
  ownerId?: string;
  featured?: boolean;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  description: string;
  audience: "students" | "teachers" | "all";
  status: string;
  sentAt?: string;
}

export interface AdminTotals {
  users: number;
  teachers: number;
  students: number;
  courses: number;
  payments: number;
  transactions: number;
  payingStudents: number;
  revenue: string;
}

export interface AdminTransaction {
  id: string;
  provider: string;
  reference: string;
  provider_status: string;
  amount: string | number;
  currency: string;
  verified_at?: string | null;
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

function normalizeTeacherPayload(payload: unknown): AdminTeacher[] {
  return normalizeListPayload<AdminTeacher>(payload).map((teacher) => ({
    ...teacher,
    tracks:
      Array.isArray(teacher.tracks) && teacher.tracks.length
        ? teacher.tracks
        : Array.isArray(teacher.academicTracks) && teacher.academicTracks.length
          ? teacher.academicTracks
          : teacher.track
            ? [teacher.track]
            : [],
    academicTracks:
      Array.isArray(teacher.academicTracks) && teacher.academicTracks.length
        ? teacher.academicTracks
        : Array.isArray(teacher.tracks) && teacher.tracks.length
          ? teacher.tracks
          : teacher.academicTrack
            ? [teacher.academicTrack]
            : [],
    temporaryPassword: teacher.temporaryPassword ?? null,
  }));
}

function normalizeCategoryPayload(payload: unknown): AdminCategory[] {
  return normalizeListPayload<AdminCategory>(payload).map((category) => ({
    ...category,
    program: category.program ?? category.name,
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.map((subcategory) => ({
          ...subcategory,
          categoryId: subcategory.categoryId ?? category.id,
        }))
      : [],
  }));
}

function normalizeCoursePayload(payload: unknown): AdminCourse[] {
  return normalizeListPayload<AdminCourse>(payload).map((course) => ({
    ...course,
    categoryId: course.categoryId ?? course.category,
    subcategoryId: course.subcategoryId ?? course.subcategory,
    teacherId: course.teacherId ?? "admin-owned",
  }));
}

function normalizeBroadcastPayload(payload: unknown): AdminBroadcast[] {
  return normalizeListPayload<AdminBroadcast>(payload);
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Session refresh is unavailable on the server.");
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
    throw new Error("Authenticated requests are unavailable on the server.");
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

  const payload = (await parseJsonSafely(response)) as T | { detail?: string };
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Request failed."));
  }

  return payload as T;
}

export function useAdminPlatform(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [totals, setTotals] = useState<AdminTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const [dashboardResult, teacherResult, categoryResult, courseResult, broadcastResult, transactionResult] =
      await Promise.allSettled([
        authenticatedRequest<{ totals: AdminTotals }>("/api/dashboard/admin/"),
        authenticatedRequest<AdminTeacher[]>("/api/admin/teachers/"),
        authenticatedRequest<AdminCategory[]>("/api/admin/categories/"),
        authenticatedRequest<AdminCourse[]>("/api/admin/courses/"),
        authenticatedRequest<AdminBroadcast[]>("/api/admin/broadcasts/"),
        authenticatedRequest<AdminTransaction[]>("/api/admin/transactions/"),
      ]);

    const failures: string[] = [];

    if (dashboardResult.status === "fulfilled") {
      setTotals(dashboardResult.value.totals);
    } else {
      failures.push(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard totals failed to load.");
    }

    if (teacherResult.status === "fulfilled") {
      setTeachers(normalizeTeacherPayload(teacherResult.value));
    } else {
      failures.push(teacherResult.reason instanceof Error ? teacherResult.reason.message : "Teachers failed to load.");
    }

    if (categoryResult.status === "fulfilled") {
      setCategories(normalizeCategoryPayload(categoryResult.value));
    } else {
      failures.push(categoryResult.reason instanceof Error ? categoryResult.reason.message : "Categories failed to load.");
    }

    if (courseResult.status === "fulfilled") {
      setCourses(normalizeCoursePayload(courseResult.value));
    } else {
      failures.push(courseResult.reason instanceof Error ? courseResult.reason.message : "Courses failed to load.");
    }

    if (broadcastResult.status === "fulfilled") {
      setBroadcasts(normalizeBroadcastPayload(broadcastResult.value));
    } else {
      failures.push(broadcastResult.reason instanceof Error ? broadcastResult.reason.message : "Broadcasts failed to load.");
    }

    if (transactionResult.status === "fulfilled") {
      setTransactions(normalizeListPayload<AdminTransaction>(transactionResult.value));
    } else {
      failures.push(transactionResult.reason instanceof Error ? transactionResult.reason.message : "Transactions failed to load.");
    }

    setError(failures.join(" | "));
    setIsLoading(false);
  }, []);

  const runAction = useCallback(async <T,>(action: () => Promise<T>) => {
    setError("");
    try {
      return await action();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Request failed.";
      setError(message);
      throw actionError;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  const activeTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.status === "active"),
    [teachers],
  );

  const createTeacher = useCallback(
    async (input: { displayName: string; email: string; program: string; track: string; tracks?: string[]; password?: string }) => {
      const teacher = await runAction(() =>
        authenticatedRequest<AdminTeacher>("/api/admin/teachers/", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
      const normalizedTeacher = normalizeTeacherPayload([teacher])[0] ?? teacher;
      setTeachers((current) => [normalizedTeacher, ...current]);
      return normalizedTeacher;
    },
    [runAction],
  );

  const updateTeacher = useCallback(async (teacherId: string, patch: Record<string, unknown>) => {
    const teacher = await runAction(() =>
      authenticatedRequest<AdminTeacher>(`/api/admin/teachers/${teacherId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
    const normalizedTeacher = normalizeTeacherPayload([teacher])[0] ?? teacher;
    setTeachers((current) => current.map((item) => (item.id === teacherId ? normalizedTeacher : item)));
    await load();
    return normalizedTeacher;
  }, [load, runAction]);

  const addCategory = useCallback(async (input: { name: string; description?: string }) => {
      const category = await runAction(() =>
        authenticatedRequest<AdminCategory>("/api/admin/categories/", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          description: input.description ?? "",
        }),
        }),
      );
    const normalizedCategory = normalizeCategoryPayload([category])[0] ?? category;
    setCategories((current) => [...current, normalizedCategory]);
    return normalizedCategory;
  }, [runAction]);

  const updateCategory = useCallback(async (categoryId: string, patch: { name?: string; description?: string }) => {
    const category = await runAction(() =>
      authenticatedRequest<AdminCategory>(`/api/admin/categories/${categoryId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
    const normalizedCategory = normalizeCategoryPayload([category])[0] ?? category;
    setCategories((current) => current.map((item) => (item.id === categoryId ? normalizedCategory : item)));
    return normalizedCategory;
  }, [runAction]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    await runAction(() =>
      authenticatedRequest(`/api/admin/categories/${categoryId}/`, { method: "DELETE" }),
    );
    setCategories((current) => current.filter((item) => item.id !== categoryId));
  }, [runAction]);

  const addSubcategory = useCallback(
    async (input: { categoryId: string; name: string; description?: string }) => {
      const subcategory = await runAction(() =>
        authenticatedRequest<AdminSubcategory>("/api/admin/subcategories/", {
          method: "POST",
          body: JSON.stringify({
            category: input.categoryId,
            name: input.name,
            description: input.description ?? "",
          }),
        }),
      );
      setCategories((current) =>
        current.map((category) =>
          category.id === input.categoryId
            ? {
                ...category,
                subcategories: [...category.subcategories, { ...subcategory, categoryId: input.categoryId }],
              }
            : category,
        ),
      );
      return subcategory;
    },
    [runAction],
  );

  const updateSubcategory = useCallback(
    async (input: { categoryId: string; subcategoryId: string; name: string; description?: string }) => {
      const subcategory = await runAction(() =>
        authenticatedRequest<AdminSubcategory>(
          `/api/admin/subcategories/${input.subcategoryId}/`,
          {
            method: "PATCH",
            body: JSON.stringify({
              category: input.categoryId,
              name: input.name,
              description: input.description ?? "",
            }),
          },
        ),
      );
      setCategories((current) =>
        current.map((category) =>
          category.id === input.categoryId
            ? {
                ...category,
                subcategories: category.subcategories.map((item) =>
                  item.id === input.subcategoryId ? { ...subcategory, categoryId: input.categoryId } : item,
                ),
              }
            : category,
        ),
      );
      return subcategory;
    },
    [runAction],
  );

  const deleteSubcategory = useCallback(async (input: { categoryId: string; subcategoryId: string }) => {
    await runAction(() =>
      authenticatedRequest(`/api/admin/subcategories/${input.subcategoryId}/`, { method: "DELETE" }),
    );
    setCategories((current) =>
      current.map((category) =>
        category.id === input.categoryId
          ? {
              ...category,
              subcategories: category.subcategories.filter((item) => item.id !== input.subcategoryId),
            }
          : category,
      ),
    );
  }, [runAction]);

  const createBroadcast = useCallback(
    async (input: { title: string; description: string; audience: "students" | "teachers" }) => {
      const broadcast = await runAction(() =>
        authenticatedRequest<AdminBroadcast>("/api/admin/broadcasts/", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
      setBroadcasts((current) => [broadcast, ...current]);
      return broadcast;
    },
    [runAction],
  );

  const clearBroadcastHistory = useCallback(async () => {
    await runAction(() => authenticatedRequest("/api/admin/broadcasts/", { method: "DELETE" }));
    setBroadcasts([]);
  }, [runAction]);

  const reassignCourse = useCallback(async (input: { courseId: string; newTeacherId: string }) => {
    await runAction(() =>
      authenticatedRequest(`/api/admin/courses/${input.courseId}/reassign/`, {
        method: "POST",
        body: JSON.stringify({
          new_teacher_profile_id: input.newTeacherId,
        }),
      }),
    );
    await load();
  }, [load, runAction]);

  const updateCourseCatalog = useCallback(async (courseId: string, patch: Record<string, unknown>) => {
    const course = await runAction(() =>
      authenticatedRequest<AdminCourse>(`/api/admin/course-catalog/${courseId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
    const normalizedCourse = normalizeCoursePayload([course])[0] ?? course;
    setCourses((current) => current.map((item) => (item.id === courseId ? normalizedCourse : item)));
    return normalizedCourse;
  }, [runAction]);

  const publishAdminOwnedCourse = useCallback(async (courseId: string) => {
    const course = await runAction(() =>
      authenticatedRequest<AdminCourse>(`/api/admin/courses/${courseId}/publish/`, {
        method: "POST",
      }),
    );
    const normalizedCourse = normalizeCoursePayload([course])[0] ?? course;
    setCourses((current) => current.map((item) => (item.id === courseId ? normalizedCourse : item)));
    return normalizedCourse;
  }, [runAction]);

  return {
    teachers,
    activeTeachers,
    categories,
    courses,
    broadcasts,
    transactions,
    totals,
    isLoading,
    error,
    reload: load,
    createTeacher,
    updateTeacher,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    createBroadcast,
    clearBroadcastHistory,
    reassignCourse,
    updateCourseCatalog,
    publishAdminOwnedCourse,
  };
}
