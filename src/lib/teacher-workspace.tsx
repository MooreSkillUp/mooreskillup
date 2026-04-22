"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  teacherProfileOptions,
  teacherUploads,
  trackOptionsByInterest,
  mockUser,
  type Interest,
  type TrackName,
  type UserRole,
} from "@/lib/mock-data";
import {
  buildPaymentReference,
  getPaymentMethodLabel,
  type PaymentMethod,
} from "@/lib/commerce";

const STORAGE_KEY = "mooreskillup.platform.workspace";
const EXPIRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const COURSE_BRAND_LABEL = "Produced by More SkillUp";

export type TeacherCourseStatus = "draft" | "published" | "archived";
export type TeacherCourseVisibility = "visible" | "hidden";
export type TeacherSectionAccess = "free" | "paid";
export type TeacherLessonContentType = "video" | "text";
export type TeacherTaskSubmissionType = "file-upload" | "text-submission";
export type StudentLessonStatus = "completed" | "in-progress" | "unlocked" | "locked";
export type StudentSectionStatus = "completed" | "in-progress" | "unlocked" | "locked";

export interface Teacher {
  id: string;
  displayName: string;
  email: string;
  academicTrack: TrackName;
  academicProgram: Interest;
  status: "active" | "inactive";
}

export interface CategorySubcategory {
  id: string;
  name: string;
}

export interface CourseCategory {
  id: string;
  name: string;
  program: Interest;
  subcategories: CategorySubcategory[];
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

export interface TeacherEnrollment {
  id: string;
  courseId: string;
  learnerName: string;
  enrolledAt: string;
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
  program: Interest;
  track: TrackName;
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
  teacherId: string;
  message: string;
  timestamp: string;
  createdAt: string;
  type:
    | "create-course"
    | "edit-course"
    | "publish-course"
    | "unpublish-course"
    | "save-draft"
    | "delete-course"
    | "reorder-content"
    | "settings-update";
}

export interface PlatformNotification {
  id: string;
  title: string;
  body: string;
  role: UserRole | "all";
  createdAt: string;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  description: string;
  audience: "students" | "tutors";
  sentAt: string;
  createdAt: string;
  status: "sent";
}

export interface TeacherProfileSettings {
  displayName: string;
  email: string;
  program: Interest;
  track: TrackName;
}

export interface TeacherDashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  activeCourses: number;
  totalLearners: number;
}

export interface StudentPaymentRecord {
  id: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  status: "successful";
  reference: string;
  paidAt: string;
}

export interface StudentCourseEnrollment {
  courseId: string;
  studentEmail: string;
  enrolledAt: string;
  completedLessonIds: string[];
  lastLessonId: string | null;
  lastAccessedAt: string | null;
}

export interface StudentLessonView {
  id: string;
  title: string;
  type: TeacherLessonContentType;
  status: StudentLessonStatus;
  videoUrl: string;
  textContent: string;
}

export interface StudentSectionView {
  id: string;
  title: string;
  description: string;
  accessType: TeacherSectionAccess;
  status: StudentSectionStatus;
  isFree: boolean;
  isLocked: boolean;
  lessons: StudentLessonView[];
  tasks: Array<{
    id: string;
    title: string;
    instructions: string;
    submissionGuide: string;
    watchGuideUrl: string;
    sectionChannelUrl: string;
    submissionChannelUrl: string;
  }>;
}

interface PersistedWorkspace {
  teachers: Teacher[];
  categories: CourseCategory[];
  courses: TeacherCourse[];
  activities: TeacherActivity[];
  notifications: PlatformNotification[];
  broadcasts: AdminBroadcast[];
  payments: StudentPaymentRecord[];
  enrollments: StudentCourseEnrollment[];
}

interface TeacherWorkspaceValue {
  teacher: Teacher;
  profile: TeacherProfileSettings;
  teachers: Teacher[];
  categories: CourseCategory[];
  courses: TeacherCourse[];
  teacherCourses: TeacherCourse[];
  activities: TeacherActivity[];
  enrollments: TeacherEnrollment[];
  stats: TeacherDashboardStats;
  notifications: PlatformNotification[];
  broadcasts: AdminBroadcast[];
  payments: StudentPaymentRecord[];
  allowedCategories: CourseCategory[];
  allowedTracks: TrackName[];
  buildEmptyCourse: () => TeacherCourse;
  getCourseById: (id: string) => TeacherCourse | undefined;
  getCategoryById: (id: string) => CourseCategory | undefined;
  getCategoryName: (id: string) => string;
  getSubcategoryName: (categoryId: string, subcategoryId: string) => string;
  saveCourse: (
    course: TeacherCourse,
    intent: "draft" | "publish" | "unpublish",
    options?: { autosave?: boolean },
  ) => { ok: boolean; course: TeacherCourse; issues: string[] };
  deleteCourse: (id: string) => void;
  clearTeacherActivities: () => void;
  updateProfile: (patch: Partial<TeacherProfileSettings>) => void;
  validateCourse: (course: TeacherCourse) => string[];
  recordActivity: (message: string, type: TeacherActivity["type"]) => void;
  markAllNotificationsAsRead: () => void;
  clearBroadcastHistory: () => void;
  createBroadcast: (input: { title: string; description: string; audience: "students" | "tutors" }) => void;
  createTeacher: (input: { displayName: string; email: string; program: Interest; track: TrackName }) => Teacher;
  updateTeacher: (teacherId: string, patch: Partial<Pick<Teacher, "displayName" | "email" | "status">>) => void;
  reassignCourse: (input: { courseId: string; newTeacherId: string }) => void;
  addCategory: (input: { name: string }) => void;
  updateCategory: (categoryId: string, patch: { name: string }) => void;
  deleteCategory: (categoryId: string) => void;
  addSubcategory: (input: { categoryId: string; name: string }) => void;
  updateSubcategory: (input: { categoryId: string; subcategoryId: string; name: string }) => void;
  deleteSubcategory: (input: { categoryId: string; subcategoryId: string }) => void;
  getDiscoverableCourses: () => TeacherCourse[];
  getMyLearningCourses: () => TeacherCourse[];
  getPurchasedCourses: () => TeacherCourse[];
  getStartedLearningCourses: () => TeacherCourse[];
  getRecentLearningCourses: () => TeacherCourse[];
  getRecommendedCourses: () => TeacherCourse[];
  getStudentPayments: () => StudentPaymentRecord[];
  getLastAccessedLessonTitle: (courseId: string) => string | null;
  isCourseOwnedByStudent: (courseId: string) => boolean;
  purchaseCourse: (
    courseId: string,
    paymentMethod?: PaymentMethod,
  ) => { ok: boolean; message: string; payment?: StudentPaymentRecord };
  getStudentCourseProgress: (courseId: string) => number;
  getStudentCourseSections: (courseId: string) => StudentSectionView[];
  findStudentLesson: (lessonId: string) => {
    course: TeacherCourse;
    section: TeacherSection;
    lesson: TeacherLesson;
    sectionIndex: number;
    lessonIndex: number;
  } | null;
  recordLessonAccess: (courseId: string, lessonId: string) => void;
  markLessonComplete: (courseId: string, lessonId: string) => void;
  getContinueLearningCourse: () => TeacherCourse | null;
  getContinueLearningLessonId: (courseId: string) => string | null;
  brandLabel: string;
}

const TeacherWorkspaceContext = createContext<TeacherWorkspaceValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isoDate() {
  return new Date().toISOString();
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function paymentMethodForIndex(index: number): PaymentMethod {
  return index % 2 === 0 ? "paystack" : "opay";
}

function buildSeedStudentRecords(courses: TeacherCourse[]) {
  const purchasedIds = Array.from(
    new Set([
      ...mockUser.purchasedCourseIds,
      "backend-javascript-engine",
      "cloud-devops-launchpad",
    ]),
  );

  const enrollments: StudentCourseEnrollment[] = [];
  const payments: StudentPaymentRecord[] = [];

  purchasedIds.forEach((courseId, index) => {
    const course = courses.find((item) => item.id === courseId);
    if (!course) return;

    enrollments.push({
      courseId,
      studentEmail: mockUser.email,
      enrolledAt: new Date(2026, 2, index + 2, 10, 15).toISOString(),
      completedLessonIds: index === 0 ? [course.sections[0]?.lessons[0]?.id ?? ""].filter(Boolean) : [],
      lastLessonId: index === 0 ? (course.sections[0]?.lessons[0]?.id ?? null) : null,
      lastAccessedAt: index === 0 ? new Date(2026, 3, 18, 16, 20).toISOString() : null,
    });

    if (course.price > 0) {
      const method = paymentMethodForIndex(index);
      payments.push({
        id: createId("payment"),
        studentEmail: mockUser.email,
        courseId,
        courseTitle: course.title,
        amount: course.price,
        paymentMethod: method,
        description: `${course.title} full course access`,
        status: "successful",
        reference: buildPaymentReference(method),
        paidAt: formatTimestamp(new Date(2026, 2, index + 2, 10 + index, 15)),
      });
    }
  });

  return { enrollments, payments };
}

function isExpired(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() > EXPIRATION_WINDOW_MS;
}

function buildDefaultCategories(): CourseCategory[] {
  return [
    {
      id: createId("category"),
      name: "Web Development",
      program: "Web Development",
      subcategories: [
        { id: createId("subcategory"), name: "Frontend Development" },
        { id: createId("subcategory"), name: "React and Modern UI" },
      ],
    },
    {
      id: createId("category"),
      name: "Backend Development",
      program: "Backend Development",
      subcategories: [
        { id: createId("subcategory"), name: "Backend with Python" },
        { id: createId("subcategory"), name: "Backend with JavaScript" },
      ],
    },
    {
      id: createId("category"),
      name: "Graphics and Design",
      program: "Graphics and Design",
      subcategories: [
        { id: createId("subcategory"), name: "UI/UX Design" },
        { id: createId("subcategory"), name: "Graphics Design" },
      ],
    },
    {
      id: createId("category"),
      name: "AI and Data",
      program: "AI and Data",
      subcategories: [
        { id: createId("subcategory"), name: "AI/ML" },
        { id: createId("subcategory"), name: "Data Analysis" },
      ],
    },
    {
      id: createId("category"),
      name: "Engineering",
      program: "Engineering",
      subcategories: [
        { id: createId("subcategory"), name: "3D Modeling" },
        { id: createId("subcategory"), name: "SolidWorks" },
      ],
    },
    {
      id: createId("category"),
      name: "Cloud and DevOps",
      program: "Cloud and DevOps",
      subcategories: [
        { id: createId("subcategory"), name: "Cloud Foundations" },
        { id: createId("subcategory"), name: "DevOps Engineering" },
      ],
    },
    {
      id: createId("category"),
      name: "Programming Languages",
      program: "Programming Languages",
      subcategories: [
        { id: createId("subcategory"), name: "JavaScript" },
        { id: createId("subcategory"), name: "Python" },
      ],
    },
  ];
}

function buildDefaultTeachers(): Teacher[] {
  return teacherProfileOptions.map((item) => ({
    id: item.id,
    displayName: item.name,
    email:
      item.email ??
      `${item.username ?? item.name.toLowerCase().replace(/\s+/g, ".")}@mooreskillup.com`,
    academicProgram: item.program,
    academicTrack: item.track,
    status: item.isActive === false ? "inactive" : "active",
  }));
}

function findBestTeacherForUpload(teachers: Teacher[], program: Interest, track: TrackName) {
  return (
    teachers.find(
      (teacher) =>
        teacher.academicProgram === program &&
        teacher.academicTrack === track &&
        teacher.status === "active",
    ) ??
    teachers.find((teacher) => teacher.academicProgram === program && teacher.status === "active") ??
    teachers[0]
  );
}

function toLesson(
  lesson: { id: string; title: string; format: "video" | "text"; resource: string },
): TeacherLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    contentType: lesson.format,
    videoUrl: lesson.format === "video" ? lesson.resource : "",
    textContent: lesson.format === "text" ? lesson.resource : "",
  };
}

function defaultCategoryForProgram(categories: CourseCategory[], program: Interest) {
  return categories.find((category) => category.program === program) ?? categories[0];
}

function defaultSubcategoryForCategory(category: CourseCategory | undefined) {
  return category?.subcategories[0];
}

function buildDefaultCourses(categories: CourseCategory[], teachers: Teacher[]): TeacherCourse[] {
  return teacherUploads.map((upload, index) => {
    const category = defaultCategoryForProgram(categories, upload.program);
    const subcategory = defaultSubcategoryForCategory(category);
    const owner = findBestTeacherForUpload(teachers, upload.program, upload.track);
    const seededPriceMap = [0, 18500, 22500, 21000, 32000, 28500];
    const seededPrice = seededPriceMap[index] ?? 25000 + index * 5000;

    return {
      id: upload.id,
      teacherId: owner?.id ?? "admin-owned",
      title: upload.title,
      subtitle: `${upload.track} instructor course`,
      categoryId: category?.id ?? "",
      subcategoryId: subcategory?.id ?? "",
      program: upload.program,
      track: upload.track,
      tags: upload.tags,
      roadmapLink: "",
      overview: upload.roadmap[0] ?? "",
      schemeOfWork: upload.roadmap.join("\n"),
      price: seededPrice,
      status:
        upload.status === "Published"
          ? "published"
          : upload.status === "Draft"
            ? "draft"
            : "archived",
      visibility: upload.status === "Published" ? "visible" : "hidden",
      sections: upload.modules.map((module, moduleIndex) => ({
        id: module.id,
        title: module.title,
        description: `${module.weekLabel} section for ${upload.title}`,
        accessType: seededPrice === 0 ? "free" : moduleIndex === 0 ? "free" : "paid",
        collapsed: false,
        lessons: module.lessons.map(toLesson),
        tasks: [
          {
            id: `${module.id}-task`,
            title: module.assessment,
            instructions: module.project,
            submissionType: "text-submission",
            resourceLinks: [],
          },
        ],
      })),
      analytics: {
        views: upload.learners * 3 + 24,
        enrollments: upload.learners,
        completionRate: upload.completionRate,
      },
      lastUpdated: formatTimestamp(),
      createdAt: isoDate(),
    };
  });
}

function buildDefaultActivities(courses: TeacherCourse[]): TeacherActivity[] {
  return courses.flatMap((course) => [
    {
      id: createId("activity"),
      teacherId: course.teacherId,
      message: `Published course ${course.title}`,
      timestamp: course.lastUpdated,
      createdAt: isoDate(),
      type: "publish-course",
    },
    {
      id: createId("activity"),
      teacherId: course.teacherId,
      message: `Added structured sections to ${course.title}`,
      timestamp: course.lastUpdated,
      createdAt: isoDate(),
      type: "edit-course",
    },
  ]);
}

function buildInitialState(): PersistedWorkspace {
  const categories = buildDefaultCategories();
  const teachers = buildDefaultTeachers();
  const courses = buildDefaultCourses(categories, teachers);
  const seededStudentRecords = buildSeedStudentRecords(courses);

  return {
    teachers,
    categories,
    courses,
    activities: buildDefaultActivities(courses),
    notifications: [],
    broadcasts: [],
    payments: seededStudentRecords.payments,
    enrollments: seededStudentRecords.enrollments,
  };
}

function normalizePersistedWorkspace(raw: Partial<PersistedWorkspace> | null | undefined): PersistedWorkspace {
  const base = buildInitialState();

  return purgeExpiredState({
    teachers: Array.isArray(raw?.teachers) ? raw.teachers : base.teachers,
    categories: Array.isArray(raw?.categories) ? raw.categories : base.categories,
    courses: Array.isArray(raw?.courses) ? raw.courses : base.courses,
    activities: Array.isArray(raw?.activities) ? raw.activities : base.activities,
    notifications: Array.isArray(raw?.notifications) ? raw.notifications : base.notifications,
    broadcasts: Array.isArray(raw?.broadcasts) ? raw.broadcasts : base.broadcasts,
    payments: Array.isArray(raw?.payments) ? raw.payments : base.payments,
    enrollments: Array.isArray(raw?.enrollments) ? raw.enrollments : base.enrollments,
  });
}

function purgeExpiredState(state: PersistedWorkspace): PersistedWorkspace {
  return {
    ...state,
    activities: state.activities.filter((item) => !isExpired(item.createdAt)),
    notifications: state.notifications.filter((item) => !isExpired(item.createdAt)),
    broadcasts: state.broadcasts.filter((item) => !isExpired(item.createdAt)),
  };
}

function buildSection(index = 1): TeacherSection {
  return {
    id: createId("section"),
    title: `Section ${index}`,
    description: "",
    accessType: index === 1 ? "free" : "paid",
    collapsed: false,
    lessons: [
      {
        id: createId("lesson"),
        title: "",
        contentType: "video",
        videoUrl: "",
        textContent: "",
      },
    ],
    tasks: [],
  };
}

function buildEmptyCourseForTeacher(teacher: Teacher, categories: CourseCategory[]): TeacherCourse {
  const category = defaultCategoryForProgram(categories, teacher.academicProgram);
  const subcategory = defaultSubcategoryForCategory(category);

  return {
    id: createId("course"),
    teacherId: teacher.id,
    title: "",
    subtitle: "",
    categoryId: category?.id ?? "",
    subcategoryId: subcategory?.id ?? "",
    program: teacher.academicProgram,
    track: teacher.academicTrack,
    tags: [],
    roadmapLink: "",
    overview: "",
    schemeOfWork: "",
    price: 0,
    status: "draft",
    visibility: "hidden",
    sections: [buildSection(1)],
    analytics: {
      views: 0,
      enrollments: 0,
      completionRate: 0,
    },
    lastUpdated: formatTimestamp(),
    createdAt: isoDate(),
  };
}

function validateCourseAgainstCategories(course: TeacherCourse, categories: CourseCategory[]) {
  const issues: string[] = [];
  const category = categories.find((item) => item.id === course.categoryId);
  const subcategory = category?.subcategories.find((item) => item.id === course.subcategoryId);

  if (!course.title.trim()) issues.push("Course title is required.");
  if (!course.subtitle.trim()) issues.push("Course subtitle is required.");
  if (!category) issues.push("Select a valid category.");
  if (!subcategory) issues.push("Select a valid subcategory.");
  if (!stripHtml(course.overview)) issues.push("Course overview is required.");
  if (!course.schemeOfWork.trim()) issues.push("Scheme of work is required.");
  if (course.price < 0) issues.push("Course price cannot be negative.");
  if (!course.sections.length) issues.push("Add at least one section before publishing.");

  course.sections.forEach((section, sectionIndex) => {
    if (!section.title.trim()) {
      issues.push(`Section ${sectionIndex + 1} needs a title.`);
    }
    if (!section.lessons.length) {
      issues.push(`Section ${sectionIndex + 1} must contain at least one lesson.`);
    }
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
}

function normalizeCourseForPricing(course: TeacherCourse): TeacherCourse {
  if (course.price === 0) {
    return {
      ...course,
      sections: course.sections.map((section) => ({ ...section, accessType: "free" })),
    };
  }
  const firstPaidIndex = course.sections.findIndex((section) => section.accessType === "paid");
  if (firstPaidIndex === -1 && course.sections.length > 1) {
    return {
      ...course,
      sections: course.sections.map((section, index) => ({
        ...section,
        accessType: index === 0 ? "free" : "paid",
      })),
    };
  }
  return course;
}

export function TeacherWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(buildInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setWorkspace(normalizePersistedWorkspace(JSON.parse(raw) as Partial<PersistedWorkspace>));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [hydrated, workspace]);

  useEffect(() => {
    if (!hydrated) return;
    const interval = window.setInterval(() => {
      setWorkspace((current) => purgeExpiredState(current));
    }, 60000);
    return () => window.clearInterval(interval);
  }, [hydrated]);

  useEffect(() => {
    if (!user || user.role !== "teacher") return;
    setWorkspace((current) => {
      if (current.teachers.some((teacher) => teacher.email === user.email)) return current;
      return {
        ...current,
        teachers: [
          ...current.teachers,
          {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            academicProgram: user.selectedInterest,
            academicTrack: user.selectedTrack,
            status: "active",
          },
        ],
      };
    });
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    setWorkspace((current) => {
      const next = clone(current);
      const purchasedIds = user.purchasedCourseIds ?? [];
      purchasedIds.forEach((courseId) => {
        if (!next.enrollments.some((item) => item.studentEmail === user.email && item.courseId === courseId)) {
          next.enrollments.push({
            courseId,
            studentEmail: user.email,
            enrolledAt: isoDate(),
            completedLessonIds: [],
            lastLessonId: null,
            lastAccessedAt: null,
          });
        }
        const course = next.courses.find((item) => item.id === courseId);
        if (
          course &&
          course.price > 0 &&
          !next.payments.some((item) => item.studentEmail === user.email && item.courseId === courseId)
        ) {
          next.payments.push({
            id: createId("payment"),
            studentEmail: user.email,
            courseId,
            courseTitle: course.title,
            amount: course.price,
            paymentMethod: paymentMethodForIndex(next.payments.length),
            description: `${course.title} full course access`,
            status: "successful",
            reference: buildPaymentReference(paymentMethodForIndex(next.payments.length)),
            paidAt: formatTimestamp(),
          });
        }
      });
      return next;
    });
  }, [user]);

  const currentTeacher = useMemo(() => {
    if (user?.role === "teacher") {
      return (
        workspace.teachers.find((teacher) => teacher.email === user.email) ??
        workspace.teachers.find((teacher) => teacher.id === user.id) ??
        workspace.teachers[0]
      );
    }
    if (user?.role === "admin") {
      return {
        id: "admin-owned",
        displayName: user.displayName,
        email: user.email,
        academicProgram: user.selectedInterest,
        academicTrack: user.selectedTrack,
        status: "active" as const,
      };
    }
    return workspace.teachers.find((teacher) => teacher.status === "active") ?? workspace.teachers[0];
  }, [user, workspace.teachers]);

  const profile = useMemo<TeacherProfileSettings>(
    () => ({
      displayName: currentTeacher.displayName,
      email: currentTeacher.email,
      program: currentTeacher.academicProgram,
      track: currentTeacher.academicTrack,
    }),
    [currentTeacher],
  );

  const allowedCategories = useMemo(
    () =>
      user?.role === "admin"
        ? workspace.categories
        : workspace.categories.filter((category) => category.program === profile.program),
    [profile.program, user?.role, workspace.categories],
  );

  const teacherCourses = useMemo(
    () => workspace.courses.filter((course) => course.teacherId === currentTeacher.id),
    [currentTeacher.id, workspace.courses],
  );

  const activities = useMemo(
    () =>
      workspace.activities
        .filter((activity) => activity.teacherId === currentTeacher.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [currentTeacher.id, workspace.activities],
  );

  const notifications = useMemo(() => {
    const role = user?.role ?? "student";
    return workspace.notifications
      .filter((item) => item.role === "all" || item.role === role)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [user?.role, workspace.notifications]);

  const stats = useMemo<TeacherDashboardStats>(() => {
    const publishedCourses = teacherCourses.filter((course) => course.status === "published").length;
    const draftCourses = teacherCourses.filter((course) => course.status === "draft").length;
    const activeCourses = teacherCourses.filter(
      (course) => course.status === "published" && course.visibility === "visible",
    ).length;
    const totalLearners = teacherCourses.reduce((sum, course) => sum + course.analytics.enrollments, 0);

    return {
      totalCourses: teacherCourses.length,
      publishedCourses,
      draftCourses,
      activeCourses,
      totalLearners,
    };
  }, [teacherCourses]);

  const enrollments = useMemo(
    () =>
      teacherCourses.flatMap((course) =>
        Array.from({ length: course.analytics.enrollments }, (_, index) => ({
          id: `${course.id}-enrollment-${index + 1}`,
          courseId: course.id,
          learnerName: `Learner ${index + 1}`,
          enrolledAt: isoDate(),
        })),
      ),
    [teacherCourses],
  );

  const allowedTracks = useMemo(
    () => {
      if (user?.role === "admin") {
        const categoryTracks = workspace.categories.flatMap((category) =>
          category.subcategories.map((subcategory) => subcategory.name),
        );
        return Array.from(new Set(categoryTracks.length ? categoryTracks : [profile.track]));
      }
      return trackOptionsByInterest[profile.program as keyof typeof trackOptionsByInterest] ?? [profile.track];
    },
    [profile.program, profile.track, user?.role, workspace.categories],
  );

  const currentStudentEmail = user?.role === "student" ? user.email : null;

  const getCourseById = useCallback(
    (id: string) => workspace.courses.find((course) => course.id === id),
    [workspace.courses],
  );

  const getCategoryById = useCallback(
    (id: string) => workspace.categories.find((category) => category.id === id),
    [workspace.categories],
  );

  const getCategoryName = useCallback(
    (id: string) => workspace.categories.find((category) => category.id === id)?.name ?? "Uncategorized",
    [workspace.categories],
  );

  const getSubcategoryName = useCallback(
    (categoryId: string, subcategoryId: string) =>
      workspace.categories
        .find((category) => category.id === categoryId)
        ?.subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ?? "Unassigned",
    [workspace.categories],
  );

  const pushNotification = useCallback((notification: Omit<PlatformNotification, "id" | "createdAt">) => {
    setWorkspace((current) => ({
      ...current,
      notifications: [
        {
          ...notification,
          id: createId("notification"),
          createdAt: isoDate(),
        },
        ...current.notifications,
      ],
    }));
  }, []);

  const recordActivity = useCallback(
    (message: string, type: TeacherActivity["type"]) => {
      setWorkspace((current) => ({
        ...current,
        activities: [
          {
            id: createId("activity"),
            teacherId: currentTeacher.id,
            message,
            timestamp: formatTimestamp(),
            createdAt: isoDate(),
            type,
          },
          ...current.activities,
        ],
      }));
    },
    [currentTeacher.id],
  );

  const validateCourse = useCallback(
    (course: TeacherCourse) => validateCourseAgainstCategories(course, workspace.categories),
    [workspace.categories],
  );

  const buildEmptyCourse = useCallback(
    () => buildEmptyCourseForTeacher(currentTeacher, workspace.categories),
    [currentTeacher, workspace.categories],
  );

  const saveCourse = useCallback(
    (
      course: TeacherCourse,
      intent: "draft" | "publish" | "unpublish",
      options?: { autosave?: boolean },
    ) => {
      const validCategories = workspace.categories.filter((category) => category.program === currentTeacher.academicProgram);
      const fallbackCategory = validCategories[0];
      const selectedCategory =
        validCategories.find((item) => item.id === course.categoryId) ?? fallbackCategory;
      const selectedSubcategory =
        selectedCategory?.subcategories.find((item) => item.id === course.subcategoryId) ??
        selectedCategory?.subcategories[0];

      const normalized = normalizeCourseForPricing({
        ...clone(course),
        teacherId: currentTeacher.id,
        categoryId: selectedCategory?.id ?? "",
        subcategoryId: selectedSubcategory?.id ?? "",
        program: currentTeacher.academicProgram,
        price: Number.isFinite(course.price) ? Math.max(0, course.price) : 0,
        status: intent === "publish" ? "published" : intent === "unpublish" ? "draft" : course.status,
        visibility: intent === "publish" ? "visible" : intent === "unpublish" ? "hidden" : course.visibility,
        lastUpdated: formatTimestamp(),
      });

      const issues = validateCourseAgainstCategories(normalized, workspace.categories);
      if (intent === "publish" && issues.length) {
        return { ok: false, course: normalized, issues };
      }

      setWorkspace((current) => {
        const exists = current.courses.some((item) => item.id === normalized.id);
        return {
          ...current,
          courses: exists
            ? current.courses.map((item) => (item.id === normalized.id ? normalized : item))
            : [normalized, ...current.courses],
        };
      });

      if (options?.autosave) {
        recordActivity(`Auto-saved draft for ${normalized.title || "Untitled course"}`, "save-draft");
      } else if (intent === "publish") {
        recordActivity(`Published course ${normalized.title}`, "publish-course");
      } else if (intent === "unpublish") {
        recordActivity(`Unpublished course ${normalized.title}`, "unpublish-course");
      } else {
        recordActivity(`Saved draft for ${normalized.title || "Untitled course"}`, "save-draft");
      }

      return { ok: true, course: normalized, issues };
    },
    [currentTeacher, recordActivity, workspace.categories],
  );

  const deleteCourse = useCallback(
    (id: string) => {
      const found = workspace.courses.find((course) => course.id === id);
      setWorkspace((current) => ({
        ...current,
        courses: current.courses.filter((course) => course.id !== id),
        payments: current.payments.filter((payment) => payment.courseId !== id),
        enrollments: current.enrollments.filter((enrollment) => enrollment.courseId !== id),
      }));
      if (found) {
        recordActivity(`Deleted course ${found.title}`, "delete-course");
      }
    },
    [recordActivity, workspace.courses],
  );

  const clearTeacherActivities = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.teacherId !== currentTeacher.id),
    }));
  }, [currentTeacher.id]);

  const updateProfile = useCallback(
    (patch: Partial<TeacherProfileSettings>) => {
      setWorkspace((current) => ({
        ...current,
        teachers: current.teachers.map((teacher) =>
          teacher.id === currentTeacher.id
            ? {
                ...teacher,
                displayName: patch.displayName ?? teacher.displayName,
              }
            : teacher,
        ),
      }));
      recordActivity("Updated teacher settings", "settings-update");
    },
    [currentTeacher.id, recordActivity],
  );

  const markAllNotificationsAsRead = useCallback(() => {
    const role = user?.role ?? "student";
    setWorkspace((current) => ({
      ...current,
      notifications: current.notifications.filter(
        (item) => !(item.role === "all" || item.role === role),
      ),
    }));
  }, [user?.role]);

  const clearBroadcastHistory = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      broadcasts: [],
    }));
  }, []);

  const createBroadcast = useCallback(
    (input: { title: string; description: string; audience: "students" | "tutors" }) => {
      const nextBroadcast: AdminBroadcast = {
        id: createId("broadcast"),
        title: input.title,
        description: input.description,
        audience: input.audience,
        sentAt: formatTimestamp(),
        createdAt: isoDate(),
        status: "sent",
      };

      setWorkspace((current) => ({
        ...current,
        broadcasts: [nextBroadcast, ...current.broadcasts],
      }));

      pushNotification({
        title: input.title,
        body: input.description,
        role: input.audience === "tutors" ? "teacher" : "student",
      });
      pushNotification({
        title: "Broadcast delivered",
        body: `${input.title} was sent to ${input.audience === "tutors" ? "teachers" : "students"}.`,
        role: "admin",
      });
    },
    [pushNotification],
  );

  const createTeacher = useCallback(
    (input: { displayName: string; email: string; program: Interest; track: TrackName }) => {
      const nextTeacher: Teacher = {
        id: createId("teacher"),
        displayName: input.displayName,
        email: input.email,
        academicProgram: input.program,
        academicTrack: input.track,
        status: "active",
      };

      setWorkspace((current) => ({
        ...current,
        teachers: [nextTeacher, ...current.teachers],
      }));

      pushNotification({
        title: "Teacher account created",
        body: `${input.displayName} is now available for course assignment.`,
        role: "admin",
      });

      return nextTeacher;
    },
    [pushNotification],
  );

  const updateTeacher = useCallback(
    (teacherId: string, patch: Partial<Pick<Teacher, "displayName" | "email" | "status">>) => {
      setWorkspace((current) => ({
        ...current,
        teachers: current.teachers.map((teacher) =>
          teacher.id === teacherId ? { ...teacher, ...patch } : teacher,
        ),
      }));
    },
    [],
  );

  const reassignCourse = useCallback(
    (input: { courseId: string; newTeacherId: string }) => {
      const sourceCourse = workspace.courses.find((course) => course.id === input.courseId);
      const nextOwner =
        workspace.teachers.find((teacher) => teacher.id === input.newTeacherId) ?? null;

      setWorkspace((current) => ({
        ...current,
        courses: current.courses.map((course) =>
          course.id === input.courseId
            ? {
                ...course,
                teacherId: nextOwner?.id ?? "admin-owned",
                lastUpdated: formatTimestamp(),
              }
            : course,
        ),
      }));

      if (sourceCourse) {
        pushNotification({
          title: "Course ownership updated",
          body: `${sourceCourse.title} was reassigned to ${nextOwner?.displayName ?? "admin ownership"}.`,
          role: "admin",
        });
        if (nextOwner) {
          pushNotification({
            title: "New course assignment",
            body: `${sourceCourse.title} has been assigned to you.`,
            role: "teacher",
          });
        }
      }
    },
    [pushNotification, workspace.courses, workspace.teachers],
  );

  const addCategory = useCallback(
    (input: { name: string }) => {
      setWorkspace((current) => ({
        ...current,
        categories: [
          {
            id: createId("category"),
            name: input.name,
            program: input.name as Interest,
            subcategories: [],
          },
          ...current.categories,
        ],
      }));
      pushNotification({
        title: "Category added",
        body: `${input.name} is now available for course organization.`,
        role: "admin",
      });
    },
    [pushNotification],
  );

  const updateCategory = useCallback((categoryId: string, patch: { name: string }) => {
    setWorkspace((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, name: patch.name } : category,
      ),
    }));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setWorkspace((current) => {
      const remainingCategories = current.categories.filter((category) => category.id !== categoryId);
      const deletedCategory = current.categories.find((category) => category.id === categoryId);

      return {
        ...current,
        categories: remainingCategories,
        courses: current.courses.map((course) => {
          if (course.categoryId !== categoryId) return course;
          const fallback = deletedCategory
            ? remainingCategories.find((item) => item.program === deletedCategory.program)
            : remainingCategories[0];
          return {
            ...course,
            categoryId: fallback?.id ?? "",
            subcategoryId: fallback?.subcategories[0]?.id ?? "",
          };
        }),
      };
    });
  }, []);

  const addSubcategory = useCallback((input: { categoryId: string; name: string }) => {
    setWorkspace((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === input.categoryId
          ? {
              ...category,
              subcategories: [
                ...category.subcategories,
                { id: createId("subcategory"), name: input.name },
              ],
            }
          : category,
      ),
    }));
  }, []);

  const updateSubcategory = useCallback(
    (input: { categoryId: string; subcategoryId: string; name: string }) => {
      setWorkspace((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === input.categoryId
            ? {
                ...category,
                subcategories: category.subcategories.map((subcategory) =>
                  subcategory.id === input.subcategoryId
                    ? { ...subcategory, name: input.name }
                    : subcategory,
                ),
              }
            : category,
        ),
      }));
    },
    [],
  );

  const deleteSubcategory = useCallback(
    (input: { categoryId: string; subcategoryId: string }) => {
      setWorkspace((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === input.categoryId
            ? {
                ...category,
                subcategories: category.subcategories.filter(
                  (subcategory) => subcategory.id !== input.subcategoryId,
                ),
              }
            : category,
        ),
        courses: current.courses.map((course) => {
          if (
            course.categoryId !== input.categoryId ||
            course.subcategoryId !== input.subcategoryId
          ) {
            return course;
          }
          const category = current.categories.find((item) => item.id === input.categoryId);
          const fallback = category?.subcategories.find(
            (subcategory) => subcategory.id !== input.subcategoryId,
          );
          return {
            ...course,
            subcategoryId: fallback?.id ?? "",
          };
        }),
      }));
    },
    [],
  );

  const getStudentEnrollment = useCallback(
    (courseId: string) =>
      currentStudentEmail
        ? workspace.enrollments.find(
            (item) => item.studentEmail === currentStudentEmail && item.courseId === courseId,
          ) ?? null
        : null,
    [currentStudentEmail, workspace.enrollments],
  );

  const isCourseOwnedByStudent = useCallback(
    (courseId: string) => {
      const course = workspace.courses.find((item) => item.id === courseId);
      if (!course) return false;
      if (user?.role !== "student") return true;
      if (course.price === 0) return true;
      return !!getStudentEnrollment(courseId);
    },
    [getStudentEnrollment, user?.role, workspace.courses],
  );

  const getDiscoverableCourses = useCallback(() => {
    const baseCourses = workspace.courses.filter(
      (course) => course.status === "published" && course.visibility === "visible",
    );

    if (user?.role !== "student") return baseCourses;

    const selectedTracks =
      Array.isArray(user.selectedTracks) && user.selectedTracks.length
        ? user.selectedTracks
        : [user.selectedTrack];

    return baseCourses
      .filter(
        (course) =>
          user.interests.includes(course.program) &&
          (selectedTracks.length === 0 || selectedTracks.includes(course.track)),
      )
      .sort((left, right) => {
        const leftScore =
          Number(selectedTracks.includes(left.track)) + Number(left.program === user.selectedInterest);
        const rightScore =
          Number(selectedTracks.includes(right.track)) + Number(right.program === user.selectedInterest);
        return rightScore - leftScore;
      });
  }, [user, workspace.courses]);

  const getMyLearningCourses = useCallback(() => {
    const discoverable = getDiscoverableCourses();
    if (user?.role !== "student") return discoverable;
    return discoverable.filter((course) => !!getStudentEnrollment(course.id));
  }, [getDiscoverableCourses, getStudentEnrollment, user?.role]);

  const getPurchasedCourses = useCallback(() => {
    if (user?.role !== "student" || !currentStudentEmail) return [];
    const paidCourseIds = new Set(
      workspace.payments
        .filter((payment) => payment.studentEmail === currentStudentEmail)
        .map((payment) => payment.courseId),
    );

    return getDiscoverableCourses().filter((course) => paidCourseIds.has(course.id));
  }, [currentStudentEmail, getDiscoverableCourses, user?.role, workspace.payments]);

  const getStartedLearningCourses = useCallback(() => {
    if (user?.role !== "student" || !currentStudentEmail) return [];
    const startedIds = new Set(
      workspace.enrollments
        .filter(
          (enrollment) =>
            enrollment.studentEmail === currentStudentEmail &&
            !!(enrollment.lastLessonId || enrollment.lastAccessedAt || enrollment.completedLessonIds.length),
        )
        .map((enrollment) => enrollment.courseId),
    );

    return getMyLearningCourses().filter((course) => startedIds.has(course.id));
  }, [currentStudentEmail, getMyLearningCourses, user?.role, workspace.enrollments]);

  const getRecommendedCourses = useCallback(() => {
    const myCourseIds = new Set(getMyLearningCourses().map((course) => course.id));
    return getDiscoverableCourses()
      .filter((course) => !myCourseIds.has(course.id))
      .slice(0, 6);
  }, [getDiscoverableCourses, getMyLearningCourses]);

  const getRecentLearningCourses = useCallback(() => {
    if (user?.role !== "student" || !currentStudentEmail) return [];
    const enrollmentMap = new Map(
      workspace.enrollments
        .filter((item) => item.studentEmail === currentStudentEmail && item.lastAccessedAt)
        .sort(
          (left, right) =>
            new Date(right.lastAccessedAt ?? 0).getTime() - new Date(left.lastAccessedAt ?? 0).getTime(),
        )
        .map((item) => [item.courseId, item]),
    );

    return Array.from(enrollmentMap.keys())
      .map((courseId) => workspace.courses.find((course) => course.id === courseId))
      .filter((course): course is TeacherCourse => !!course);
  }, [currentStudentEmail, user?.role, workspace.courses, workspace.enrollments]);

  const getStudentPayments = useCallback(
    () =>
      currentStudentEmail
        ? workspace.payments
            .filter((payment) => payment.studentEmail === currentStudentEmail)
            .sort(
              (left, right) =>
                new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime(),
            )
        : [],
    [currentStudentEmail, workspace.payments],
  );

  const getLastAccessedLessonTitle = useCallback(
    (courseId: string) => {
      const enrollment = getStudentEnrollment(courseId);
      const lessonId = enrollment?.lastLessonId;
      if (!lessonId) return null;
      for (const course of workspace.courses) {
        for (const section of course.sections) {
          const lesson = section.lessons.find((item) => item.id === lessonId);
          if (lesson) return lesson.title || "Untitled lesson";
        }
      }
      return null;
    },
    [getStudentEnrollment, workspace.courses],
  );

  const getStudentCourseProgress = useCallback(
    (courseId: string) => {
      const course = workspace.courses.find((item) => item.id === courseId);
      if (!course) return 0;
      const totalLessons = course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
      if (!totalLessons) return 0;
      const enrollment = getStudentEnrollment(courseId);
      const completed = enrollment?.completedLessonIds.length ?? 0;
      return Math.round((completed / totalLessons) * 100);
    },
    [getStudentEnrollment, workspace.courses],
  );

  const getContinueLearningLessonId = useCallback(
    (courseId: string) => {
      const enrollment = getStudentEnrollment(courseId);
      if (!enrollment) return null;
      if (enrollment.lastLessonId) return enrollment.lastLessonId;
      const course = workspace.courses.find((item) => item.id === courseId);
      return course?.sections[0]?.lessons[0]?.id ?? null;
    },
    [getStudentEnrollment, workspace.courses],
  );

  const getStudentCourseSections = useCallback(
    (courseId: string): StudentSectionView[] => {
      const course = workspace.courses.find((item) => item.id === courseId);
      if (!course) return [];
      const enrollment = getStudentEnrollment(courseId);
      const owned = course.price === 0 || !!enrollment || user?.role !== "student";
      let hasReachedOpenLesson = false;

      return course.sections.map((section) => {
        const sectionLocked = !owned && course.price > 0 && section.accessType === "paid";
        const lessons = section.lessons.map((lesson) => {
          const completed = !!enrollment?.completedLessonIds.includes(lesson.id);
          const lastViewed = enrollment?.lastLessonId === lesson.id;
          let status: StudentLessonStatus = "locked";

          if (sectionLocked) {
            status = "locked";
          } else if (completed) {
            status = "completed";
          } else if (lastViewed) {
            status = "in-progress";
            hasReachedOpenLesson = true;
          } else if (!hasReachedOpenLesson) {
            status = "unlocked";
            hasReachedOpenLesson = true;
          } else {
            status = "unlocked";
          }

          return {
            id: lesson.id,
            title: lesson.title,
            type: lesson.contentType,
            status,
            videoUrl: lesson.videoUrl,
            textContent: lesson.textContent,
          };
        });

        const completedCount = lessons.filter((lesson) => lesson.status === "completed").length;
        const sectionStatus: StudentSectionStatus = sectionLocked
          ? "locked"
          : completedCount === lessons.length && lessons.length > 0
            ? "completed"
            : lessons.some((lesson) => lesson.status === "in-progress" || lesson.status === "completed")
              ? "in-progress"
              : "unlocked";

        return {
          id: section.id,
          title: section.title,
          description: section.description,
          accessType: section.accessType,
          status: sectionStatus,
          isFree: course.price === 0 || section.accessType === "free",
          isLocked: sectionLocked,
          lessons,
          tasks: section.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            instructions: task.instructions,
            submissionGuide: "Review the task brief, complete the work, and submit through the course channel.",
            watchGuideUrl: task.resourceLinks[0] ?? "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            sectionChannelUrl: task.resourceLinks[1] ?? "https://wa.me/2340000000000",
            submissionChannelUrl: task.resourceLinks[2] ?? "https://wa.me/2340000000000",
          })),
        };
      });
    },
    [getStudentEnrollment, user?.role, workspace.courses],
  );

  const findStudentLesson = useCallback(
    (lessonId: string) => {
      for (const course of workspace.courses) {
        for (const [sectionIndex, section] of course.sections.entries()) {
          const lessonIndex = section.lessons.findIndex((lesson) => lesson.id === lessonId);
          if (lessonIndex >= 0) {
            return {
              course,
              section,
              lesson: section.lessons[lessonIndex],
              sectionIndex,
              lessonIndex,
            };
          }
        }
      }
      return null;
    },
    [workspace.courses],
  );

  const recordLessonAccess = useCallback(
    (courseId: string, lessonId: string) => {
      if (!currentStudentEmail || user?.role !== "student") return;
      setWorkspace((current) => {
        const existingEnrollment = current.enrollments.find(
          (enrollment) =>
            enrollment.studentEmail === currentStudentEmail && enrollment.courseId === courseId,
        );

        if (existingEnrollment?.lastLessonId === lessonId) {
          return current;
        }

        return {
          ...current,
          enrollments: existingEnrollment
            ? current.enrollments.map((enrollment) =>
                enrollment.studentEmail === currentStudentEmail && enrollment.courseId === courseId
                  ? {
                      ...enrollment,
                      lastLessonId: lessonId,
                      lastAccessedAt: isoDate(),
                    }
                  : enrollment,
              )
            : [
                {
                  courseId,
                  studentEmail: currentStudentEmail,
                  enrolledAt: isoDate(),
                  completedLessonIds: [],
                  lastLessonId: lessonId,
                  lastAccessedAt: isoDate(),
                },
                ...current.enrollments,
              ],
        };
      });
    },
    [currentStudentEmail, user?.role],
  );

  const markLessonComplete = useCallback(
    (courseId: string, lessonId: string) => {
      if (!currentStudentEmail || user?.role !== "student") return;
      setWorkspace((current) => ({
        ...current,
        enrollments: current.enrollments.some(
          (enrollment) => enrollment.studentEmail === currentStudentEmail && enrollment.courseId === courseId,
        )
          ? current.enrollments.map((enrollment) =>
              enrollment.studentEmail === currentStudentEmail && enrollment.courseId === courseId
                ? {
                    ...enrollment,
                    completedLessonIds: enrollment.completedLessonIds.includes(lessonId)
                      ? enrollment.completedLessonIds
                      : [...enrollment.completedLessonIds, lessonId],
                    lastLessonId: lessonId,
                    lastAccessedAt: isoDate(),
                  }
                : enrollment,
            )
          : [
              {
                courseId,
                studentEmail: currentStudentEmail,
                enrolledAt: isoDate(),
                completedLessonIds: [lessonId],
                lastLessonId: lessonId,
                lastAccessedAt: isoDate(),
              },
              ...current.enrollments,
            ],
      }));
    },
    [currentStudentEmail, user?.role],
  );

  const purchaseCourse = useCallback(
    (courseId: string, paymentMethod: PaymentMethod = "paystack") => {
      if (!currentStudentEmail || user?.role !== "student") {
        return { ok: false, message: "Only students can purchase courses." };
      }
      const course = workspace.courses.find((item) => item.id === courseId);
      if (!course) return { ok: false, message: "Course not found." };
      if (course.price === 0 || getStudentEnrollment(courseId)) {
        return { ok: false, message: "You already own this course." };
      }

      const nextEnrollment: StudentCourseEnrollment = {
        courseId,
        studentEmail: currentStudentEmail,
        enrolledAt: isoDate(),
        completedLessonIds: [],
        lastLessonId: course.sections[0]?.lessons[0]?.id ?? null,
        lastAccessedAt: isoDate(),
      };

      const nextPayment: StudentPaymentRecord = {
        id: createId("payment"),
        studentEmail: currentStudentEmail,
        courseId,
        courseTitle: course.title,
        amount: course.price,
        paymentMethod,
        description: `${course.title} full course access`,
        status: "successful",
        reference: buildPaymentReference(paymentMethod),
        paidAt: formatTimestamp(),
      };

      setWorkspace((current) => ({
        ...current,
        enrollments: [nextEnrollment, ...current.enrollments],
        payments: [nextPayment, ...current.payments],
      }));

      updateUser({
        purchasedCourseIds: [...(user.purchasedCourseIds ?? []), courseId],
      });

      pushNotification({
        title: "Course unlocked",
        body: `${course.title} is now available in My Courses via ${getPaymentMethodLabel(paymentMethod)}.`,
        role: "student",
      });

      return {
        ok: true,
        message: `${course.title} unlocked successfully.`,
        payment: nextPayment,
      };
    },
    [currentStudentEmail, getStudentEnrollment, pushNotification, updateUser, user, workspace.courses],
  );

  const getContinueLearningCourse = useCallback(() => {
    const recent = getRecentLearningCourses();
    if (recent.length) return recent[0];
    const mine = getMyLearningCourses();
    return mine[0] ?? null;
  }, [getMyLearningCourses, getRecentLearningCourses]);

  const value = useMemo<TeacherWorkspaceValue>(
    () => ({
      teacher: currentTeacher,
      profile,
      teachers: workspace.teachers,
      categories: workspace.categories,
      courses: workspace.courses,
      teacherCourses,
      activities,
      enrollments,
      stats,
      notifications,
      broadcasts: workspace.broadcasts.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
      payments: workspace.payments,
      allowedCategories,
      allowedTracks,
      buildEmptyCourse,
      getCourseById,
      getCategoryById,
      getCategoryName,
      getSubcategoryName,
      saveCourse,
      deleteCourse,
      clearTeacherActivities,
      updateProfile,
      validateCourse,
      recordActivity,
      markAllNotificationsAsRead,
      clearBroadcastHistory,
      createBroadcast,
      createTeacher,
      updateTeacher,
      reassignCourse,
      addCategory,
      updateCategory,
      deleteCategory,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      getDiscoverableCourses,
      getMyLearningCourses,
      getPurchasedCourses,
      getStartedLearningCourses,
      getRecentLearningCourses,
      getRecommendedCourses,
      getStudentPayments,
      getLastAccessedLessonTitle,
      isCourseOwnedByStudent,
      purchaseCourse,
      getStudentCourseProgress,
      getStudentCourseSections,
      findStudentLesson,
      recordLessonAccess,
      markLessonComplete,
      getContinueLearningCourse,
      getContinueLearningLessonId,
      brandLabel: COURSE_BRAND_LABEL,
    }),
    [
      activities,
      addCategory,
      addSubcategory,
      allowedCategories,
      allowedTracks,
      buildEmptyCourse,
      clearTeacherActivities,
      clearBroadcastHistory,
      createBroadcast,
      createTeacher,
      currentTeacher,
      deleteCategory,
      deleteCourse,
      deleteSubcategory,
      enrollments,
      findStudentLesson,
      getCategoryById,
      getCategoryName,
      getContinueLearningCourse,
      getContinueLearningLessonId,
      getCourseById,
      getDiscoverableCourses,
      getLastAccessedLessonTitle,
      getMyLearningCourses,
      getPurchasedCourses,
      getRecentLearningCourses,
      getRecommendedCourses,
      getStartedLearningCourses,
      getStudentCourseProgress,
      getStudentCourseSections,
      getStudentPayments,
      getSubcategoryName,
      isCourseOwnedByStudent,
      markAllNotificationsAsRead,
      markLessonComplete,
      notifications,
      profile,
      purchaseCourse,
      recordActivity,
      recordLessonAccess,
      reassignCourse,
      saveCourse,
      stats,
      teacherCourses,
      updateCategory,
      updateProfile,
      updateSubcategory,
      updateTeacher,
      validateCourse,
      workspace.broadcasts,
      workspace.categories,
      workspace.courses,
      workspace.payments,
      workspace.teachers,
    ],
  );

  return (
    <TeacherWorkspaceContext.Provider value={value}>
      {children}
    </TeacherWorkspaceContext.Provider>
  );
}

export function useTeacherWorkspace() {
  const ctx = useContext(TeacherWorkspaceContext);
  if (!ctx) {
    throw new Error("useTeacherWorkspace must be used within TeacherWorkspaceProvider");
  }
  return ctx;
}
