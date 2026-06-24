import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authenticatedRequest,
  extractErrorMessage,
  normalizeListPayload,
} from "./authenticated-api";
import { useAuth } from "./auth";


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

export interface AdminStudent {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  selectedInterest: string;
  selectedTrack: string;
  selectedTracks: string[];
  plan: string;
  status: "active" | "disabled";
  lastActiveAt?: string | null;
  enrolledCourses: number;
  completedCourses: number;
  totalPayments: number;
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
  communityUrl?: string;
  communityLabel?: string;
  displayOrder?: number;
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
  isRecommended?: boolean;
  pendingDeletion?: boolean;
  deletionReason?: string;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  description: string;
  audience: "students" | "teachers" | "admins" | "moderators" | "all";
  status: string;
  sentAt?: string;
  scheduledAt?: string | null;
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
  publishedCourses?: number;
  pendingCourses?: number;
  activeEnrollments?: number;
  completedEnrollments?: number;
  monthlyRevenue?: string;
  courseCompletionRate?: number;
  activeUsersToday?: number;
}

export interface AdminAnalytics {
  registrations: Array<{ label: string; students: number; teachers: number }>;
  revenue: Array<{ label: string; revenue: number }>;
  engagement: Array<{ courseId: string; title: string; enrollments: number; completionRate: number }>;
  weeklyEnrollments?: number;
  monthlyEnrollments?: number;
}

export interface AdminActivityEvent {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: string;
}

export interface AdminTransaction {
  id: string;
  provider: string;
  reference: string;
  provider_status: string;
  amount: string | number;
  currency: string;
  verified_at?: string | null;
  created_at?: string;
  payment_id?: string;
  payment__status?: string;
  payment__course__title?: string;
  payment__student__user__display_name?: string;
  payment__student__user__email?: string;
  refundEligible?: boolean;
  refundReason?: string;
}

export interface AdminSupportTicket {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  createdBy: string;
  createdByRole: string;
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

function normalizeStudentPayload(payload: unknown): AdminStudent[] {
  return normalizeListPayload<AdminStudent>(payload).map((student) => ({
    ...student,
    selectedTracks:
      Array.isArray(student.selectedTracks) && student.selectedTracks.length
        ? student.selectedTracks
        : student.selectedTrack
          ? [student.selectedTrack]
          : [],
    lastActiveAt: student.lastActiveAt ?? null,
  }));
}

function normalizeCategoryPayload(payload: unknown): AdminCategory[] {
  return normalizeListPayload<AdminCategory>(payload).map((category) => ({
    ...category,
    program: category.program ?? category.name,
    communityUrl: category.communityUrl ?? "",
    communityLabel: category.communityLabel ?? "",
    displayOrder: category.displayOrder ?? 0,
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

function normalizeSupportTicketPayload(payload: unknown): AdminSupportTicket[] {
  return normalizeListPayload<AdminSupportTicket>(payload);
}

export function useAdminPlatform(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [totals, setTotals] = useState<AdminTotals | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [activityFeed, setActivityFeed] = useState<AdminActivityEvent[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError("");

    const hasPerm = (p: string) => !!user.permissions?.includes(p);

    const promises: Promise<any>[] = [];
    const keys: string[] = [];

    if (hasPerm("dashboard:view")) {
      promises.push(authenticatedRequest("/api/dashboard/admin/"));
      keys.push("dashboard");
    }
    if (hasPerm("teachers:view")) {
      promises.push(authenticatedRequest("/api/admin/teachers/"));
      keys.push("teachers");
    }
    if (hasPerm("students:view")) {
      promises.push(authenticatedRequest("/api/admin/students/"));
      keys.push("students");
    }
    if (hasPerm("categories:view")) {
      promises.push(authenticatedRequest("/api/admin/categories/"));
      keys.push("categories");
    }
    if (hasPerm("courses:view")) {
      promises.push(authenticatedRequest("/api/admin/courses/"));
      keys.push("courses");
    }
    if (hasPerm("notifications:view")) {
      promises.push(authenticatedRequest("/api/admin/broadcasts/"));
      keys.push("broadcasts");
    }
    if (hasPerm("payments:view")) {
      promises.push(authenticatedRequest("/api/admin/transactions/"));
      keys.push("transactions");
    }
    if (hasPerm("support:view")) {
      promises.push(authenticatedRequest("/api/admin/support-tickets/"));
      keys.push("supportTickets");
    }

    const results = await Promise.allSettled(promises);
    const failures: string[] = [];

    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === "fulfilled") {
        const val = result.value;
        if (key === "dashboard") {
          setTotals(val.totals);
          setAnalytics(val.analytics ?? null);
          setActivityFeed(val.activityFeed ?? []);
          setSystemAlerts(val.systemAlerts ?? {});
        } else if (key === "teachers") {
          setTeachers(normalizeTeacherPayload(val));
        } else if (key === "students") {
          setStudents(normalizeStudentPayload(val));
        } else if (key === "categories") {
          setCategories(normalizeCategoryPayload(val));
        } else if (key === "courses") {
          setCourses(normalizeCoursePayload(val));
        } else if (key === "broadcasts") {
          setBroadcasts(normalizeBroadcastPayload(val));
        } else if (key === "transactions") {
          setTransactions(normalizeListPayload<AdminTransaction>(val));
        } else if (key === "supportTickets") {
          setSupportTickets(normalizeSupportTicketPayload(val));
        }
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : "Request failed.";
        failures.push(`${key} failed to load: ${msg}`);
      }
    });

    if (failures.length > 0) {
      setError(failures.join(" | "));
    }
    setIsLoading(false);
  }, [user]);

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
    if (!enabled || !user) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [enabled, user, load]);


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

  const deleteTeacher = useCallback(async (teacherId: string) => {
    await runAction(() => authenticatedRequest(`/api/admin/teachers/${teacherId}/`, { method: "DELETE" }));
    setTeachers((current) => current.filter((teacher) => teacher.id !== teacherId));
    await load();
  }, [load, runAction]);

  const resendTeacherInvite = useCallback(
    async (teacherId: string) =>
      authenticatedRequest<{ detail: string }>(`/api/admin/teachers/${teacherId}/resend-invite/`, {
        method: "POST",
      }),
    [],
  );

  const updateStudent = useCallback(async (studentId: string, patch: Record<string, unknown>) => {
    const student = await runAction(() =>
      authenticatedRequest<AdminStudent>(`/api/admin/students/${studentId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
    const normalized = normalizeStudentPayload([student])[0] ?? student;
    setStudents((current) => current.map((item) => (item.id === studentId ? normalized : item)));
    await load();
    return normalized;
  }, [load, runAction]);

  const deleteStudent = useCallback(async (studentId: string) => {
    await runAction(() => authenticatedRequest(`/api/admin/students/${studentId}/`, { method: "DELETE" }));
    setStudents((current) => current.filter((student) => student.id !== studentId));
    await load();
  }, [load, runAction]);

  const grantStudentAccess = useCallback(
    async (studentId: string, courseId: string) => {
      const result = await runAction(() =>
        authenticatedRequest<{ detail: string }>(`/api/admin/students/${studentId}/grant-access/`, {
          method: "POST",
          body: JSON.stringify({ courseId }),
        }),
      );
      await load();
      return result;
    },
    [load, runAction],
  );

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

  const updateCategory = useCallback(async (categoryId: string, patch: { name?: string; description?: string; communityUrl?: string; communityLabel?: string; displayOrder?: number }) => {
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
    async (input: {
      title: string;
      description: string;
      audience: "students" | "teachers" | "admins" | "moderators" | "all";
      scheduledAt?: string | null;
    }) => {
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

  const deleteBroadcast = useCallback(async (broadcastId: string) => {
    await runAction(() => authenticatedRequest(`/api/admin/broadcasts/${broadcastId}/`, { method: "DELETE" }));
    setBroadcasts((current) => current.filter((broadcast) => broadcast.id !== broadcastId));
  }, [runAction]);

  const updateSupportTicket = useCallback(async (ticketId: string, patch: Record<string, unknown>) => {
    const ticket = await runAction(() =>
      authenticatedRequest<AdminSupportTicket>(`/api/admin/support-tickets/${ticketId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
    setSupportTickets((current) => current.map((item) => (item.id === ticketId ? ticket : item)));
    return ticket;
  }, [runAction]);

  const deleteSupportTicket = useCallback(async (ticketId: string) => {
    await runAction(() => authenticatedRequest(`/api/admin/support-tickets/${ticketId}/`, { method: "DELETE" }));
    setSupportTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
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

  const deleteCourse = useCallback(async (courseId: string) => {
    await runAction(() =>
      authenticatedRequest(`/api/admin/courses/${courseId}/delete/`, { method: "POST" }),
    );
    setCourses((current) => current.filter((course) => course.id !== courseId));
  }, [runAction]);

  const abortCourseDeletion = useCallback(async (courseId: string) => {
    await runAction(() =>
      authenticatedRequest(`/api/admin/courses/${courseId}/abort-deletion/`, { method: "POST" }),
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

  const moderateCourse = useCallback(
    async (courseId: string, action: "approve" | "decline" | "archive" | "restore", reason?: string) => {
      const course = await runAction(() =>
        authenticatedRequest<AdminCourse>(`/api/admin/courses/${courseId}/${action}/`, {
          method: "POST",
          body: reason ? JSON.stringify({ reason }) : undefined,
        }),
      );
      const normalizedCourse = normalizeCoursePayload([course])[0] ?? course;
      setCourses((current) => current.map((item) => (item.id === courseId ? normalizedCourse : item)));
      return normalizedCourse;
    },
    [runAction],
  );

  return {
    teachers,
    students,
    activeTeachers,
    categories,
    courses,
    broadcasts,
    transactions,
    supportTickets,
    totals,
    analytics,
    activityFeed,
    systemAlerts,
    isLoading,
    error,
    reload: load,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resendTeacherInvite,
    updateStudent,
    deleteStudent,
    grantStudentAccess,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    createBroadcast,
    clearBroadcastHistory,
    deleteBroadcast,
    updateSupportTicket,
    deleteSupportTicket,
    reassignCourse,
    deleteCourse,
    abortCourseDeletion,
    moderateCourse,
    updateCourseCatalog,
    publishAdminOwnedCourse,
  };
}
