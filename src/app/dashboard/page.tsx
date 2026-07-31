"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { CommunityLinks } from "@/components/dashboard/CommunityLinks";
import { useAuth } from "@/lib/auth";
import { useRecommended, useStudentDashboard } from "@/lib/student";

// Dashboard sub-components
import { StudentDashboardHero } from "@/components/student/dashboard/StudentDashboardHero";
import { StatsGrid } from "@/components/student/dashboard/StatsGrid";
import { ContinueLearningCard } from "@/components/student/dashboard/ContinueLearningCard";
import { LearningTracks } from "@/components/student/dashboard/LearningTracks";
import { UpcomingTasks } from "@/components/student/dashboard/UpcomingTasks";
import { DailyGoal } from "@/components/student/dashboard/DailyGoal";
import { LearningStreak } from "@/components/student/dashboard/LearningStreak";
import { MyCoursesList } from "@/components/student/dashboard/MyCoursesList";
import { RecommendedCourses } from "@/components/student/dashboard/RecommendedCourses";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isStudent = user?.role === "student";
  const { data, isLoading } = useStudentDashboard(isStudent);
  const { courses: recommended, isLoading: recLoading } = useRecommended(isStudent);

  const stats = data?.stats;
  const cont = data?.continueLearning;

  const handleBrowse = () => router.push("/dashboard/courses");

  return (
    <AppShell allowedRoles={["student"]}>
      {/* ─── Main page layout ─────────────────────────────────────────── */}
      <div className="space-y-8">

        {/* ── Hero Banner ────────────────────────────────────────────────── */}
        <StudentDashboardHero
          displayName={user?.displayName}
          continueLearning={
            cont
              ? {
                  courseId: cont.courseId,
                  courseTitle: cont.courseTitle,
                  lessonId: cont.lessonId,
                  progressPercent: cont.progressPercent,
                  lessonTitle: undefined, // backend doesn't provide this yet
                }
              : null
          }
          onBrowseClick={handleBrowse}
        />

        {/* ── Two-column layout (main + sidebar) ─────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className="space-y-8 min-w-0">

            {/* Continue Learning */}
            <ContinueLearningCard
              continueLearning={
                cont
                  ? {
                      courseId: cont.courseId,
                      courseTitle: cont.courseTitle,
                      lessonId: cont.lessonId,
                      progressPercent: cont.progressPercent,
                      lessonTitle: undefined,
                    }
                  : null
              }
            />

            {/* Learning Tracks */}
            <LearningTracks />

            {/* My Courses */}
            <MyCoursesList
              courses={data?.recentCourses ?? []}
              isLoading={isLoading}
            />

            {/* Recommended Courses */}
            <RecommendedCourses
              courses={recommended}
              isLoading={recLoading}
            />

            {/* Community Links */}
            <CommunityLinks />
          </div>

          {/* ── RIGHT SIDEBAR ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Stats Grid */}
            <StatsGrid stats={stats} loading={isLoading} />

            {/* Daily Goal Ring */}
            <DailyGoal />

            {/* Learning Streak */}
            <LearningStreak />

            {/* Upcoming Tasks */}
            <UpcomingTasks />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
