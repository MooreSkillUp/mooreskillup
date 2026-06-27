import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedRequest, buildApiUrl, getAccessToken, parseJsonSafely } from "./authenticated-api";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface StudentCourse {
  id: string;
  title: string;
  subtitle: string;
  overview: string;
  program: string;
  track: string;
  level: CourseLevel;
  price: number;
  discountPrice: number | null;
  currency: string;
  techStack: string[];
  tags: string[];
  teacherName: string;
  teacherId: string;
  averageRating: number;
  reviewCount: number;
  certificateEnabled: boolean;
  isOwned: boolean;
  isInWatchlist: boolean;
  totalLessons: number;
  enrollments: number;
}

export interface EnrolledCourse {
  enrollmentId: string;
  course: StudentCourse;
  status: "active" | "completed" | "revoked";
  progressPercent: number;
  lastLessonId: string | null;
  enrolledAt: string;
  lastAccessedAt: string | null;
}

export function normalizeStudentCourse(raw: Record<string, unknown>): StudentCourse {
  const num = (v: unknown, d = 0) => (v === null || v === undefined ? d : Number(v));
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    subtitle: String(raw.subtitle ?? ""),
    overview: String(raw.overview ?? ""),
    program: String(raw.program ?? raw.categoryName ?? ""),
    track: String(raw.track ?? raw.subcategoryName ?? ""),
    level: (String(raw.level ?? "beginner") as CourseLevel),
    price: num(raw.price),
    discountPrice: raw.discountPrice == null ? null : Number(raw.discountPrice),
    currency: String(raw.currency ?? "NGN"),
    techStack: arr(raw.techStack),
    tags: arr(raw.tags),
    teacherName: String(raw.teacherName ?? "MooreSkillUp"),
    teacherId: String(raw.teacherId ?? ""),
    averageRating: num(raw.averageRating),
    reviewCount: num(raw.reviewCount),
    certificateEnabled: Boolean(raw.certificateEnabled),
    isOwned: Boolean(raw.isOwned),
    isInWatchlist: Boolean(raw.isInWatchlist),
    totalLessons: num(raw.total_lessons ?? raw.totalLessons),
    enrollments: num((raw.analytics as Record<string, unknown> | undefined)?.enrollments),
  };
}

export interface CatalogFilters {
  search?: string;
  category?: string;
  track?: string;
  level?: string;
  price?: "" | "free" | "paid";
  sort?: "newest" | "popular" | "rating" | "price-low" | "price-high";
  page?: number;
}

function buildQuery(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.track) params.set("track", filters.track);
  if (filters.level) params.set("level", filters.level);
  if (filters.price) params.set("price", filters.price);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Public catalog (works logged-out too) with filters + pagination. */
export function useCatalog(filters: CatalogFilters) {
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const query = buildQuery(filters);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    const token = getAccessToken();
    fetch(buildApiUrl(`/api/courses/${query}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        const payload = await parseJsonSafely(response);
        if (!active) return;
        const results = Array.isArray(payload) ? payload : (payload?.results ?? []);
        setCourses(results.map((c: Record<string, unknown>) => normalizeStudentCourse(c)));
        setCount(typeof payload?.count === "number" ? payload.count : results.length);
        setHasNext(Boolean(payload?.next));
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load courses.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  return { courses, count, hasNext, isLoading, error };
}

export function useMyCourses(enabled = true) {
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const payload = await authenticatedRequest<unknown>("/api/my-courses/");
      const rows = Array.isArray(payload) ? payload : ((payload as { results?: unknown[] })?.results ?? []);
      setEnrollments(
        rows.map((raw) => {
          const r = raw as Record<string, unknown>;
          return {
            enrollmentId: String(r.id ?? ""),
            course: normalizeStudentCourse((r.course ?? {}) as Record<string, unknown>),
            status: (String(r.status ?? "active") as EnrolledCourse["status"]),
            progressPercent: Number(r.progressPercent ?? 0),
            lastLessonId: r.lastLessonId ? String(r.lastLessonId) : null,
            enrolledAt: String(r.enrolled_at ?? ""),
            lastAccessedAt: r.last_accessed_at ? String(r.last_accessed_at) : null,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your courses.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { enrollments, isLoading, error, refresh };
}

export function useRecommended(enabled = true) {
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    authenticatedRequest<unknown>("/api/courses/recommended/")
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : ((payload as { results?: unknown[] })?.results ?? []);
        setCourses(rows.map((c) => normalizeStudentCourse(c as Record<string, unknown>)));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { courses, isLoading };
}

export async function enrollFree(courseId: string) {
  return authenticatedRequest(`/api/courses/${courseId}/enroll/`, { method: "POST" });
}

export interface CourseLesson {
  id: string;
  title: string;
  type: "video" | "text" | "resource";
  status: string;
  duration: string | null;
  isPreviewable: boolean;
}

export interface CourseTaskItem {
  id: string;
  title: string;
  kind: "assignment" | "project";
}

export interface CourseSection {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  isLocked: boolean;
  lessons: CourseLesson[];
  assignments: CourseTaskItem[];
  projects: CourseTaskItem[];
}

export interface CourseDetail extends StudentCourse {
  schemeOfWork: string;
  roadmapLink: string;
  sections: CourseSection[];
}

function normalizeCourseDetail(raw: Record<string, unknown>): CourseDetail {
  const base = normalizeStudentCourse(raw);
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    ...base,
    schemeOfWork: String(raw.scheme_of_work ?? raw.schemeOfWork ?? ""),
    roadmapLink: String(raw.roadmap_link ?? raw.roadmapLink ?? ""),
    sections: sections.map((s) => {
      const sec = s as Record<string, unknown>;
      return {
        id: String(sec.id ?? ""),
        title: String(sec.title ?? ""),
        description: String(sec.description ?? ""),
        isFree: Boolean(sec.isFree),
        isLocked: Boolean(sec.isLocked),
        lessons: (Array.isArray(sec.lessons) ? sec.lessons : []).map((l) => {
          const lesson = l as Record<string, unknown>;
          return {
            id: String(lesson.id ?? ""),
            title: String(lesson.title ?? ""),
            type: (String(lesson.type ?? lesson.content_type ?? "text") as CourseLesson["type"]),
            status: String(lesson.status ?? "unlocked"),
            duration: lesson.duration ? String(lesson.duration) : null,
            isPreviewable: Boolean(lesson.is_previewable),
          };
        }),
        assignments: (Array.isArray(sec.tasks) ? sec.tasks : []).map((t) => ({
          id: String((t as Record<string, unknown>).id ?? ""),
          title: String((t as Record<string, unknown>).title ?? ""),
          kind: "assignment" as const,
        })),
        projects: (Array.isArray(sec.projects) ? sec.projects : []).map((p) => ({
          id: String((p as Record<string, unknown>).id ?? ""),
          title: String((p as Record<string, unknown>).title ?? ""),
          kind: "project" as const,
        })),
      };
    }),
  };
}

export function useCourse(courseId: string) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`/api/courses/${courseId}/`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await parseJsonSafely(response);
      if (!response.ok || !payload) {
        throw new Error("Course not found.");
      }
      setCourse(normalizeCourseDetail(payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load course.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { course, isLoading, error, refresh };
}

export interface CourseReview {
  id: string;
  rating: number;
  comment: string;
  studentName: string;
  createdAt: string;
}

export function useCourseReviews(courseId: string) {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/courses/${courseId}/reviews/`));
      const payload = await parseJsonSafely(response);
      const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
      setReviews(
        rows.map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ""),
          rating: Number(r.rating ?? 0),
          comment: String(r.comment ?? ""),
          studentName: String(r.studentName ?? "Student"),
          createdAt: String(r.createdAt ?? ""),
        })),
      );
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { reviews, isLoading, refresh };
}

export async function submitReview(courseId: string, rating: number, comment: string) {
  return authenticatedRequest(`/api/courses/${courseId}/reviews/`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

export interface PlayerLesson {
  id: string;
  title: string;
  type: "video" | "text" | "resource";
  sectionTitle: string;
  videoUrl: string;
  embedUrl: string;
  textContent: string;
  resourceLinks: { type: string; title: string; url: string }[];
}

export interface PlayerAssignment {
  id: string;
  title: string;
  instructions: string;
  submissionType: string;
  submissionUrl: string;
  howToSubmit: string;
  dueDate: string | null;
}

export interface PlayerProject {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deliverables: string;
  submissionUrl: string;
  howToSubmit: string;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  type: string;
  isPreviewable: boolean;
  locked: boolean;
  completed: boolean;
}

export interface PlayerData {
  course: { id: string; title: string; certificateEnabled: boolean };
  isEnrolled: boolean;
  canAccess: boolean;
  lesson: PlayerLesson;
  progress: { status: string; lastPositionSeconds: number };
  sectionItems: { assignments: PlayerAssignment[]; projects: PlayerProject[] };
  curriculum: { id: string; title: string; isLocked: boolean; lessons: CurriculumLesson[] }[];
  prevLessonId: string | null;
  nextLessonId: string | null;
}

export function usePlayer(lessonId: string) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`/api/student/lessons/${lessonId}/`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await parseJsonSafely(response);
      if (!response.ok || !payload) throw new Error("Lesson not found.");
      setData(payload as PlayerData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load lesson.");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export async function saveLessonProgress(
  lessonId: string,
  body: { status?: string; position_seconds?: number },
) {
  return authenticatedRequest(`/api/progress/lessons/${lessonId}/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getLessonNote(lessonId: string) {
  return authenticatedRequest<{ content: string }>(`/api/lessons/${lessonId}/note/`);
}

export async function saveLessonNote(lessonId: string, content: string) {
  return authenticatedRequest(`/api/lessons/${lessonId}/note/`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export interface StudentDashboard {
  user: { id: string; displayName: string; avatar: string; avatarUrl: string; selectedTrack: string };
  stats: { enrolled: number; inProgress: number; completed: number; certificates: number };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string | null;
    progressPercent: number;
  } | null;
  recentCourses: {
    id: string;
    title: string;
    subtitle: string;
    level: string;
    progressPercent: number;
    lastLessonId: string | null;
    status: string;
  }[];
  unreadNotifications: number;
}

export function useStudentDashboard(enabled = true) {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    authenticatedRequest<StudentDashboard>("/api/dashboard/student/")
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { data, isLoading };
}

// Avatar catalogue lives in a React-free module so server components can use it.
export { AVATARS, getAvatarById, type AvatarOption } from "./avatars";

export async function initializePayment(courseId: string, callbackUrl?: string) {
  return authenticatedRequest<{
    reference: string;
    authorization_url: string;
    amount: string;
    live: boolean;
  }>("/api/payments/initialize/", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, payment_method: "paystack", callback_url: callbackUrl ?? "" }),
  });
}

export async function verifyPayment(reference: string) {
  return authenticatedRequest<{ status: string; course_unlocked: boolean; courseId?: string }>(
    "/api/payments/verify/",
    {
      method: "POST",
      body: JSON.stringify({ reference }),
    },
  );
}

export interface StudentPayment {
  id: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function useMyPayments(enabled = true) {
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    authenticatedRequest<unknown>("/api/payments/")
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : ((payload as { results?: unknown[] })?.results ?? []);
        setPayments(
          rows.map((p) => {
            const r = p as Record<string, unknown>;
            return {
              id: String(r.id ?? ""),
              courseTitle: String(r.courseTitle ?? ""),
              amount: Number(r.amount ?? 0),
              currency: String(r.currency ?? "NGN"),
              status: String(r.status ?? ""),
              reference: r.reference ? String(r.reference) : null,
              paidAt: r.paidAt ? String(r.paidAt) : null,
              createdAt: String(r.created_at ?? ""),
            };
          }),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { payments, isLoading };
}

export interface SupportTicket {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  adminNotes: string;
  createdAt: string;
}

export const SUPPORT_CATEGORIES = [
  { value: "payment", label: "Payment issue" },
  { value: "technical", label: "Technical problem" },
  { value: "course", label: "Course access problem" },
  { value: "account", label: "Account recovery" },
  { value: "other", label: "Other" },
];

export function useStudentTickets(enabled = true) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const payload = await authenticatedRequest<unknown>("/api/student/support-tickets/");
      const rows = Array.isArray(payload) ? payload : ((payload as { results?: unknown[] })?.results ?? []);
      setTickets(
        rows.map((t) => {
          const r = t as Record<string, unknown>;
          return {
            id: String(r.id ?? ""),
            category: String(r.category ?? "other"),
            title: String(r.title ?? ""),
            description: String(r.description ?? ""),
            status: String(r.status ?? "open"),
            priority: String(r.priority ?? "medium"),
            adminNotes: String(r.admin_notes ?? ""),
            createdAt: String(r.created_at ?? ""),
          };
        }),
      );
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tickets, isLoading, refresh };
}

export async function createSupportTicket(payload: { category: string; title: string; description: string }) {
  return authenticatedRequest("/api/student/support-tickets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface StudentCertificate {
  id: string;
  courseTitle: string;
  certificateCode: string;
  issuedAt: string;
  verificationUrl: string;
  isRevoked: boolean;
}

export interface CertificateTemplate {
  institutionName: string;
  signatoryName: string;
  signatoryTitle: string;
  accentColor: string;
  signatureText: string;
  sealText: string;
}

export function useMyCertificates(enabled = true) {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      authenticatedRequest<unknown>("/api/certificates/"),
      fetch(buildApiUrl("/api/certificates/template/")).then(parseJsonSafely),
    ])
      .then(([certs, tmpl]) => {
        if (!active) return;
        const rows = Array.isArray(certs) ? certs : ((certs as { results?: unknown[] })?.results ?? []);
        setCertificates(
          rows.map((c) => {
            const r = c as Record<string, unknown>;
            return {
              id: String(r.id ?? ""),
              courseTitle: String(r.courseTitle ?? r.course_title ?? ""),
              certificateCode: String(r.certificateCode ?? r.certificate_code ?? ""),
              issuedAt: String(r.issuedAt ?? r.issued_at ?? ""),
              verificationUrl: String(r.verificationUrl ?? r.verification_url ?? ""),
              isRevoked: Boolean(r.isRevoked),
            };
          }),
        );
        if (tmpl) setTemplate(tmpl as CertificateTemplate);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { certificates, template, isLoading };
}

export interface TaxonomyOption {
  category: string;
  tracks: string[];
}

export function useStudentTaxonomy() {
  const [taxonomy, setTaxonomy] = useState<TaxonomyOption[]>([]);

  useEffect(() => {
    let active = true;
    fetch(buildApiUrl("/api/categories/"))
      .then(parseJsonSafely)
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        setTaxonomy(
          rows.map((c: Record<string, unknown>) => ({
            category: String(c.name ?? ""),
            tracks: Array.isArray(c.subcategories)
              ? c.subcategories.map((s: Record<string, unknown>) => String(s.name ?? ""))
              : [],
          })),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => taxonomy.map((t) => t.category), [taxonomy]);
  return { taxonomy, categories };
}
