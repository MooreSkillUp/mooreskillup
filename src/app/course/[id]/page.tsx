"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, FileQuestion, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../../components/dashboard/AppShell";
import { LessonCard } from "../../../components/dashboard/LessonCard";
import { Button } from "../../../components/ui-kit/Button";
import { ProgressBar } from "../../../components/ui-kit/ProgressBar";
import { courses } from "../../../lib/mock-data";
import { quizzesForCourse } from "../../../lib/quiz-data";
import { cn } from "../../../lib/utils";

export default function CoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const course = courses.find((item) => item.id === courseId);
  const [openModule, setOpenModule] = useState<string | null>(
    course?.modules[0]?.id ?? null,
  );

  if (!course) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Course not found</h1>
          <Link href="/courses">
            <Button variant="outline" className="mt-4">
              Back to courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const pct = Math.round((course.completedLessons / course.totalLessons) * 100);
  const courseQuizzes = quizzesForCourse(course.id);

  return (
    <AppShell>
      <div className="space-y-6">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${course.cover} p-6 text-white shadow-lg sm:p-8`}
        >
          <BookOpen className="absolute right-6 top-6 h-20 w-20 text-white/15" />
          <div className="text-xs font-medium uppercase tracking-wider text-white/80">
            Course
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-2 max-w-2xl text-white/85">{course.description}</p>
          <div className="mt-5 max-w-md">
            <ProgressBar
              value={pct}
              label={`${course.completedLessons} of ${course.totalLessons} lessons`}
            />
          </div>
        </div>

        <div className="space-y-3">
          {course.modules.map((module) => {
            const isOpen = openModule === module.id;
            const done = module.lessons.filter(
              (lesson) => lesson.status === "completed",
            ).length;

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <button
                  onClick={() => setOpenModule(isOpen ? null : module.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Week {module.week}
                    </div>
                    <div className="mt-0.5 font-display text-lg font-semibold">
                      {module.title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {done}/{module.lessons.length} lessons completed
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-border bg-muted/20 p-4">
                        {module.lessons.map((lesson, index) => (
                          <LessonCard key={lesson.id} lesson={lesson} index={index} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {courseQuizzes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl font-bold">Quizzes</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {courseQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/quiz/${quiz.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="font-display text-base font-semibold">
                      {quiz.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {quiz.questions.length} questions · +{quiz.pointsReward} pts
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
