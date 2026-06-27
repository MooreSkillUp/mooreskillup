import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest, buildApiUrl, getAccessToken } from "./authenticated-api";

export interface TeacherAnalyticsCourseRow {
  courseId: string;
  title: string;
  status: string;
  enrollments: number;
  activeLearners: number;
  completionRate: number;
  views: number;
}

export interface TeacherAnalyticsData {
  totals: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    pendingReviewCourses: number;
    declinedCourses: number;
    totalEnrollments: number;
    activeLearners: number;
    completionRate: number;
    totalViews: number;
  };
  courses: TeacherAnalyticsCourseRow[];
  enrollmentTrend: { label: string; enrollments: number }[];
}

export function useTeacherAnalytics(enabled = true) {
  const [data, setData] = useState<TeacherAnalyticsData | null>(null);
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
      const payload = await authenticatedRequest<TeacherAnalyticsData>("/api/teacher/analytics/");
      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

async function downloadCsv(endpoint: string, filename: string) {
  const token = getAccessToken();
  const response = await fetch(buildApiUrl(endpoint), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Unable to export.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTeacherAnalyticsCsv() {
  return downloadCsv("/api/teacher/analytics/export/", "course-analytics.csv");
}

export function downloadTeacherStudentsCsv() {
  return downloadCsv("/api/teacher/students/export/", "students.csv");
}

export interface TeacherStudentRow {
  studentId: string;
  name: string;
  email: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  lastActiveAt: string | null;
  progressPercent: number;
  status: string;
  isActive: boolean;
}

export interface TeacherStudentsData {
  summary: {
    totalEnrolled: number;
    uniqueStudents: number;
    activeStudents: number;
    completedStudents: number;
    inactiveStudents: number;
  };
  students: TeacherStudentRow[];
}

export function useTeacherStudents(enabled = true) {
  const [data, setData] = useState<TeacherStudentsData | null>(null);
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
      const payload = await authenticatedRequest<TeacherStudentsData>("/api/teacher/students/");
      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load students.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
