/**
 * Enhanced Analytics System
 * Comprehensive metrics: course performance, user engagement, ticket resolution, revenue, and admin activity
 */

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  teacherId: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  revenue: number;
  lastUpdated: string;
}

export interface UserEngagementMetrics {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  studentEngagementRate: number;
  teacherEngagementRate: number;
  averageSessionDuration: number;
  averageLogins: number;
}

export interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  averageFirstResponseTime: number;
  customerSatisfactionScore: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  averageOrderValue: number;
  totalTransactions: number;
  refundRate: number;
  paymentMethodBreakdown: Record<string, number>;
  revenueByTeacher: Array<{ teacherId: string; teacherName: string; revenue: number }>;
  revenueByCategory: Record<string, number>;
}

export interface AdminActivityTrends {
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  mostActiveAdmin: { id: string; email: string; actionCount: number };
  mostModifiedResource: { type: string; id: string; modifications: number };
  errorRate: number;
  averageResponseTime: number;
}

export interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  courseCount: number;
  totalEnrollments: number;
  averageCompletionRate: number;
  averageRating: number;
  totalRevenue: number;
  studentSatisfaction: number;
  courseSubmissionRate: number;
}

export interface AnalyticsSnapshot {
  timestamp: string;
  courseAnalytics: CourseAnalytics[];
  userEngagement: UserEngagementMetrics;
  ticketMetrics: TicketAnalytics;
  revenueMetrics: RevenueAnalytics;
  adminActivity: AdminActivityTrends;
  teacherPerformance: TeacherPerformance[];
  refreshedAt: string;
  staleDataWarning: boolean;
  lastRefreshDuration: number; // milliseconds
}

const analyticsCache: {
  snapshot: AnalyticsSnapshot | null;
  refreshedAt: number;
} = {
  snapshot: null,
  refreshedAt: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function refreshAnalytics(): Promise<AnalyticsSnapshot> {
  const now = Date.now();
  const startTime = now;

  try {
    const response = await fetch("/api/admin/analytics/", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    const snapshot = (await response.json()) as AnalyticsSnapshot;
    snapshot.refreshedAt = new Date().toISOString();
    snapshot.lastRefreshDuration = Date.now() - startTime;
    snapshot.staleDataWarning = false;

    analyticsCache.snapshot = snapshot;
    analyticsCache.refreshedAt = now;

    return snapshot;
  } catch (error) {
    // Return cached snapshot if available, even if stale
    if (analyticsCache.snapshot) {
      analyticsCache.snapshot.staleDataWarning = true;
      analyticsCache.snapshot.lastRefreshDuration = Date.now() - startTime;
      return analyticsCache.snapshot;
    }

    // Return empty snapshot
    return getEmptySnapshot();
  }
}

export function getAnalyticsSnapshot(): AnalyticsSnapshot {
  // Check if cache is still fresh
  if (
    analyticsCache.snapshot &&
    Date.now() - analyticsCache.refreshedAt < CACHE_DURATION
  ) {
    return analyticsCache.snapshot;
  }

  // Return current cache or empty snapshot
  if (analyticsCache.snapshot) {
    analyticsCache.snapshot.staleDataWarning = true;
    return analyticsCache.snapshot;
  }

  return getEmptySnapshot();
}

export function getAnalyticsTimestamps(): {
  cached: string | null;
  refreshedAt: string | null;
} {
  return {
    cached:
      analyticsCache.snapshot && analyticsCache.refreshedAt
        ? new Date(analyticsCache.refreshedAt).toISOString()
        : null,
    refreshedAt: analyticsCache.snapshot?.refreshedAt ?? null,
  };
}

export function getTimeSinceLastRefresh(): number {
  return Date.now() - analyticsCache.refreshedAt;
}

export function isCacheFresh(): boolean {
  return Date.now() - analyticsCache.refreshedAt < CACHE_DURATION;
}

export function getCourseMetrics(): CourseAnalytics[] {
  return analyticsCache.snapshot?.courseAnalytics ?? [];
}

export function getTopCoursesByEnrollments(limit: number = 5): CourseAnalytics[] {
  return getCourseMetrics()
    .sort((a, b) => b.totalEnrollments - a.totalEnrollments)
    .slice(0, limit);
}

export function getTopCoursesByRevenue(limit: number = 5): CourseAnalytics[] {
  return getCourseMetrics()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getTopCoursesByRating(limit: number = 5): CourseAnalytics[] {
  return getCourseMetrics()
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);
}

export function getUserEngagementMetrics(): UserEngagementMetrics {
  return analyticsCache.snapshot?.userEngagement ?? getEmptyEngagementMetrics();
}

export function getTicketMetrics(): TicketAnalytics {
  return analyticsCache.snapshot?.ticketMetrics ?? getEmptyTicketMetrics();
}

export function getRevenueMetrics(): RevenueAnalytics {
  return analyticsCache.snapshot?.revenueMetrics ?? getEmptyRevenueMetrics();
}

export function getAdminActivityTrends(): AdminActivityTrends {
  return analyticsCache.snapshot?.adminActivity ?? getEmptyAdminActivity();
}

export function getTeacherPerformance(): TeacherPerformance[] {
  return analyticsCache.snapshot?.teacherPerformance ?? [];
}

export function getTopTeachers(limit: number = 5): TeacherPerformance[] {
  return getTeacherPerformance()
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export function getTeacherRankings(metric: "revenue" | "rating" | "enrollments" | "completion"): TeacherPerformance[] {
  const teachers = getTeacherPerformance();

  const sortedTeachers = [...teachers].sort((a, b) => {
    switch (metric) {
      case "revenue":
        return b.totalRevenue - a.totalRevenue;
      case "rating":
        return b.studentSatisfaction - a.studentSatisfaction;
      case "enrollments":
        return b.totalEnrollments - a.totalEnrollments;
      case "completion":
        return b.averageCompletionRate - a.averageCompletionRate;
    }
  });

  return sortedTeachers;
}

export function generateAnalyticsReport(format: "json" | "csv" = "json"): string {
  const snapshot = getAnalyticsSnapshot();

  if (format === "json") {
    return JSON.stringify(snapshot, null, 2);
  }

  // CSV format
  const lines: string[] = [];

  // Header
  lines.push("MooreSkillUp Analytics Report");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // User Engagement
  lines.push("User Engagement Metrics");
  lines.push(
    `Total Users,Active Today,Active This Week,Active This Month,Student Engagement Rate,Teacher Engagement Rate`
  );
  const ue = snapshot.userEngagement;
  lines.push(
    `${ue.totalUsers},${ue.activeUsersToday},${ue.activeUsersThisWeek},${ue.activeUsersThisMonth},${ue.studentEngagementRate}%,${ue.teacherEngagementRate}%`
  );
  lines.push("");

  // Revenue Metrics
  lines.push("Revenue Metrics");
  lines.push(
    `Total Revenue,Monthly Revenue,Daily Revenue,Average Order Value,Total Transactions,Refund Rate`
  );
  const rm = snapshot.revenueMetrics;
  lines.push(
    `₦${rm.totalRevenue},₦${rm.monthlyRevenue},₦${rm.dailyRevenue},₦${rm.averageOrderValue},${rm.totalTransactions},${rm.refundRate}%`
  );
  lines.push("");

  // Ticket Metrics
  lines.push("Support Ticket Metrics");
  lines.push(
    `Total,Open,In Progress,Resolved,Avg Resolution Time (hours),Customer Satisfaction`
  );
  const tm = snapshot.ticketMetrics;
  lines.push(
    `${tm.totalTickets},${tm.openTickets},${tm.inProgressTickets},${tm.resolvedTickets},${(tm.averageResolutionTime / 3600000).toFixed(2)},${tm.customerSatisfactionScore}/5`
  );
  lines.push("");

  // Course Analytics
  lines.push("Top Courses by Enrollments");
  lines.push("Course Title,Teacher ID,Total Enrollments,Completed,Completion Rate,Rating");
  snapshot.courseAnalytics
    .sort((a, b) => b.totalEnrollments - a.totalEnrollments)
    .slice(0, 10)
    .forEach((ca) => {
      lines.push(
        `"${ca.courseTitle}",${ca.teacherId},${ca.totalEnrollments},${ca.completedEnrollments},${ca.completionRate}%,${ca.averageRating}/5`
      );
    });

  return lines.join("\n");
}

function getEmptySnapshot(): AnalyticsSnapshot {
  return {
    timestamp: new Date().toISOString(),
    courseAnalytics: [],
    userEngagement: getEmptyEngagementMetrics(),
    ticketMetrics: getEmptyTicketMetrics(),
    revenueMetrics: getEmptyRevenueMetrics(),
    adminActivity: getEmptyAdminActivity(),
    teacherPerformance: [],
    refreshedAt: new Date().toISOString(),
    staleDataWarning: true,
    lastRefreshDuration: 0,
  };
}

function getEmptyEngagementMetrics(): UserEngagementMetrics {
  return {
    totalUsers: 0,
    activeUsersToday: 0,
    activeUsersThisWeek: 0,
    activeUsersThisMonth: 0,
    studentEngagementRate: 0,
    teacherEngagementRate: 0,
    averageSessionDuration: 0,
    averageLogins: 0,
  };
}

function getEmptyTicketMetrics(): TicketAnalytics {
  return {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    averageResolutionTime: 0,
    averageFirstResponseTime: 0,
    customerSatisfactionScore: 0,
    ticketsByCategory: {},
    ticketsByPriority: {},
  };
}

function getEmptyRevenueMetrics(): RevenueAnalytics {
  return {
    totalRevenue: 0,
    monthlyRevenue: 0,
    dailyRevenue: 0,
    averageOrderValue: 0,
    totalTransactions: 0,
    refundRate: 0,
    paymentMethodBreakdown: {},
    revenueByTeacher: [],
    revenueByCategory: {},
  };
}

function getEmptyAdminActivity(): AdminActivityTrends {
  return {
    actionsToday: 0,
    actionsThisWeek: 0,
    actionsThisMonth: 0,
    mostActiveAdmin: { id: "", email: "", actionCount: 0 },
    mostModifiedResource: { type: "", id: "", modifications: 0 },
    errorRate: 0,
    averageResponseTime: 0,
  };
}

export function downloadAnalyticsReport(format: "json" | "csv" = "csv"): void {
  const content = generateAnalyticsReport(format);
  const mimeType = format === "json" ? "application/json" : "text/csv";
  const extension = format === "json" ? "json" : "csv";

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `analytics-report-${Date.now()}.${extension}`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
