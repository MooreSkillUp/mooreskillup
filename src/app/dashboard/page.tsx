"use client";

import { motion } from "framer-motion";
import { Compass, Flame, ShoppingBag, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { CourseCard } from "../../components/dashboard/CourseCard";
import { Button } from "../../components/ui-kit/Button";
import { ProgressBar } from "../../components/ui-kit/ProgressBar";
import { useAuth } from "../../lib/auth";
import {
  academyPrograms,
  announcements,
  getLearnerDashboardCourses,
  getPlanComparisonNotes,
  notifications,
  pricingPlans,
  quizShopItems,
  todaysLesson,
} from "../../lib/mock-data";

export default function DashboardPage() {
  const { user } = useAuth();
  const today = todaysLesson();
  const personalized = getLearnerDashboardCourses(user?.interests ?? [], user?.plan ?? "free");
  const featuredCourses = personalized.recommended.slice(0, 2);
  const main = personalized.current[0];
  const pct = Math.round((main.completedLessons / main.totalLessons) * 100);
  const currentPlan = pricingPlans.find((plan) => plan.id === user?.plan);
  const currentPlanNotes = currentPlan ? getPlanComparisonNotes(currentPlan) : [];
  const unreadNotifications = notifications.filter((item) => !item.read);
  const activeProgram = academyPrograms.find((program) => program.title === user?.selectedInterest);
  const activeBranch = activeProgram?.branches.find((branch) => branch.title === user?.selectedTrack);

  return (
    <AppShell>
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-primary-foreground shadow-lg sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-white/75">
                Personalized dashboard
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
                {user?.displayName}, your next best learning move is ready.
              </h1>
              <p className="mt-4 max-w-2xl text-white/85">
                Built around your {user?.selectedInterest} path, your {user?.selectedTrack}
                track, and your {user?.plan} plan.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Stat icon={Flame} label="Current streak" value="6 days" />
                <Stat icon={Trophy} label="Points" value="1,840" />
                <Stat icon={ShoppingBag} label="Quiz Shop" value="3 items" />
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-black/15 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-white/70">
                Recommended right now
              </div>
              <div className="mt-3 font-display text-2xl font-bold">{main.title}</div>
              <p className="mt-3 text-sm text-white/80">{main.description}</p>
              <div className="mt-5">
                <ProgressBar value={pct} label="Current track progress" />
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={`/course/${main.id}`}>
                  <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                    Open track
                  </Button>
                </Link>
                <Link href="/dashboard/courses">
                  <Button variant="accent">My courses</Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                    Today&apos;s lesson
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">{today.lesson.title}</h2>
                </div>
                <Link href={`/lesson/${today.lesson.id}`}>
                  <Button variant="accent">Continue</Button>
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Week {today.module.week} | {today.lesson.duration} | from {today.course.title}
              </p>
            </div>

            {activeProgram && (
              <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Your academy path</h2>
                </div>
                <div className="mt-4 rounded-2xl bg-muted/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Selected program
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">{activeProgram.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{activeProgram.description}</p>
                </div>
                {activeBranch && (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Active track
                    </div>
                    <div className="mt-2 font-display text-xl font-bold">{activeBranch.title}</div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {activeBranch.weeklyFocus.slice(0, 4).map((item) => (
                        <div key={item}>{item}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                    Continue learning
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Recommended next inside your dashboard
                  </h2>
                </div>
                <Link href="/dashboard/courses" className="text-sm font-semibold text-primary hover:text-accent">
                  Open my courses
                </Link>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {featuredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-display text-xl font-bold">Plan snapshot</h2>
              </div>
              <div className="mt-4 rounded-2xl bg-muted/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Current plan
                </div>
                <div className="mt-2 font-display text-3xl font-bold">{currentPlan?.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{currentPlan?.description}</p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {currentPlanNotes.map((note) => (
                    <div key={note}>{note}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-xl font-bold">Notifications</h2>
              <div className="mt-4 space-y-3">
                {unreadNotifications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-xl font-bold">What&apos;s new</h2>
              <div className="mt-4 space-y-3">
                {announcements.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-xl font-bold">Shop spotlight</h2>
              <div className="mt-4 space-y-3">
                {quizShopItems.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm font-semibold text-primary">{item.cost} pts</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.reward}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.2em] text-white/75">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
