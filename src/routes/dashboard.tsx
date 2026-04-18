import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flame, PlayCircle, Trophy } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { AnnouncementPanel } from "@/components/dashboard/AnnouncementPanel";
import { StreakWidget } from "@/components/dashboard/StreakWidget";
import { announcements, courses, todaysLesson } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const today = todaysLesson();
  const main = courses[0];
  const pct = Math.round((main.completedLessons / main.totalLessons) * 100);

  return (
    <AppShell>
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-primary-foreground shadow-lg sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-white/75">
                Welcome back
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
                {user?.displayName} 👋
              </h1>
              <p className="mt-2 max-w-md text-white/85">
                You're {pct}% through <strong>{main.title}</strong>. Keep the momentum.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Stat icon={Flame} label="Streak" value="6 days" />
              <Stat icon={Trophy} label="Completed" value={`${main.completedLessons}/${main.totalLessons}`} />
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Your progress</h2>
                <Link to="/course/$id" params={{ id: main.id }} className="text-sm font-semibold text-primary hover:text-accent">
                  View course
                </Link>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{main.title}</p>
              <div className="mt-4">
                <ProgressBar value={pct} label="Course completion" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Today's lesson</h2>
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <PlayCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Week {today.module.week} · {today.lesson.duration}
                    </div>
                    <div className="font-semibold">{today.lesson.title}</div>
                  </div>
                </div>
                <Link to="/lesson/$id" params={{ id: today.lesson.id }}>
                  <Button variant="accent">Continue →</Button>
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Your courses</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {courses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <StreakWidget />
            <AnnouncementPanel items={announcements} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/15 px-4 py-3 backdrop-blur">
      <Icon className="h-5 w-5" />
      <div>
        <div className="text-xs uppercase tracking-wider text-white/75">{label}</div>
        <div className="font-display text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}
