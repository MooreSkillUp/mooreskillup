"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { CommunityLinks } from "@/components/dashboard/CommunityLinks";
import { ComingUp } from "@/components/student/dashboard/ComingUp";
import { ContinueLearningCard } from "@/components/student/dashboard/ContinueLearningCard";
import { MyCoursesList } from "@/components/student/dashboard/MyCoursesList";
import { RecommendedCourses } from "@/components/student/dashboard/RecommendedCourses";
import { TodayCard } from "@/components/student/dashboard/TodayCard";
import { WelcomeBanner } from "@/components/student/dashboard/WelcomeBanner";
import { useAuth } from "@/lib/auth";
import { useUpcoming } from "@/lib/schedule";
import { useRecommended, useStudentDashboard } from "@/lib/student";

/**
 * The student's home screen.
 *
 * Its one job is answering "what do I do next?", so Continue Learning is the
 * loudest thing on the page and everything else is context around it.
 *
 * Every number here is recorded, not derived for effect — the streak, the daily
 * goal and the hours all come from time the server banked while a lesson was
 * open, and Coming Up shows real events and real due dates. A new student sees
 * zeros, which is the honest answer, so each widget carries an empty state that
 * reads as a starting point rather than a failure.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const { data, isLoading } = useStudentDashboard(isStudent);
  const { courses: recommended, isLoading: recLoading } = useRecommended(isStudent);
  const { items: upcoming, isLoading: upcomingLoading } = useUpcoming(isStudent);

  const continueLearning = data?.continueLearning ?? null;
  // The same course in full catalog shape, so its banner matches its card.
  const continueCourse = data?.recentCourses.find((c) => c.id === continueLearning?.courseId);

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <WelcomeBanner
          name={user?.displayName}
          streakDays={data?.activity.streakDays}
          enrolled={data?.stats.enrolled}
          completed={data?.stats.completed}
          totalMinutes={data?.activity.totalMinutes}
          certificates={data?.stats.certificates}
          loading={isLoading}
        />

        <ContinueLearningCard
          continueLearning={continueLearning}
          course={continueCourse}
          loading={isLoading}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <MyCoursesList courses={data?.recentCourses ?? []} isLoading={isLoading} />
            <RecommendedCourses courses={recommended} isLoading={recLoading} />
            <CommunityLinks />
          </div>

          <div className="space-y-6">
            <TodayCard
              targetMinutes={data?.activity.dailyGoalMinutes}
              earnedMinutes={data?.activity.minutesToday}
              streakDays={data?.activity.streakDays}
              week={data?.activity.week}
              loading={isLoading}
            />
            <ComingUp items={upcoming} isLoading={upcomingLoading} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
