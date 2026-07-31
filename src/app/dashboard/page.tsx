"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { CommunityLinks } from "@/components/dashboard/CommunityLinks";
import { ContinueLearningCard } from "@/components/student/dashboard/ContinueLearningCard";
import { DailyGoal } from "@/components/student/dashboard/DailyGoal";
import { LearningStreak } from "@/components/student/dashboard/LearningStreak";
import { LearningTracks } from "@/components/student/dashboard/LearningTracks";
import { MyCoursesList } from "@/components/student/dashboard/MyCoursesList";
import { RecommendedCourses } from "@/components/student/dashboard/RecommendedCourses";
import { StatsGrid } from "@/components/student/dashboard/StatsGrid";
import { UpcomingTasks } from "@/components/student/dashboard/UpcomingTasks";
import { useAuth } from "@/lib/auth";
import { useRecommended, useStudentDashboard, useStudentTracks } from "@/lib/student";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The student's home screen.
 *
 * Its one job is answering "what do I do next?", so it leads with the lesson
 * they stopped on. Everything below that is context.
 *
 * Every number here is recorded, not derived for effect — the streak, the daily
 * goal and the hours all come from time the server banked while a lesson was
 * open. A new student sees zeros, which is the honest answer, so each widget
 * carries an empty state that reads as a starting point rather than a failure.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const { data, isLoading } = useStudentDashboard(isStudent);
  const { courses: recommended, isLoading: recLoading } = useRecommended(isStudent);
  const { tracks, isLoading: tracksLoading } = useStudentTracks();

  const continueLearning = data?.continueLearning ?? null;
  // The same course in full catalog shape, so its banner matches its card.
  const continueCourse = data?.recentCourses.find((c) => c.id === continueLearning?.courseId);

  const firstName = user?.displayName?.split(" ")[0];

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s where you left off.</p>
        </div>

        <ContinueLearningCard
          continueLearning={continueLearning}
          course={continueCourse}
          loading={isLoading}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-8">
            <LearningTracks tracks={tracks} loading={tracksLoading} />
            <MyCoursesList courses={data?.recentCourses ?? []} isLoading={isLoading} />
            <RecommendedCourses courses={recommended} isLoading={recLoading} />
            <CommunityLinks />
          </div>

          <div className="space-y-6">
            <StatsGrid stats={data?.stats} activity={data?.activity} loading={isLoading} />
            <DailyGoal
              targetMinutes={data?.activity.dailyGoalMinutes}
              earnedMinutes={data?.activity.minutesToday}
              loading={isLoading}
            />
            <LearningStreak
              streakDays={data?.activity.streakDays}
              week={data?.activity.week}
              loading={isLoading}
            />
            <UpcomingTasks tasks={data?.upcoming} loading={isLoading} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
