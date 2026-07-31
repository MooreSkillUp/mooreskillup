"use client";

import Link from "next/link";
import Image from "next/image";
import { Compass, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";

interface HeroProps {
  displayName?: string;
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string | null;
    progressPercent: number;
    lessonTitle?: string;
  } | null;
  onBrowseClick?: () => void;
}

export function StudentDashboardHero({ displayName, continueLearning, onBrowseClick }: HeroProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const userName = displayName?.split(" ")[0] ?? "Learner";

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 p-6 text-white shadow-lg md:p-8 lg:p-10">
      {/* Background Decorative Blobs */}
      <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 -mb-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        {/* Left Content */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              ✨ Learning Hub
            </div>
            <h1 className="mt-4 font-display text-lg font-medium text-white/90">
              {getGreeting()}, {userName}
            </h1>
            <div className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Keep learning. <br />
              Keep building. <br />
              Keep growing.
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
              Your dashboard is now a focused learning center. Gain real-world skills and build your portfolio with MSU.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {continueLearning ? (
              <Link href={continueLearning.lessonId ? `/lesson/${continueLearning.lessonId}` : `/course/${continueLearning.courseId}`}>
                <Button variant="ghost" size="lg" className="rounded-full bg-white font-semibold text-orange-600 shadow-md hover:bg-white/90 hover:shadow-lg transition duration-200">
                  <Play className="h-4 w-4 fill-orange-600 text-orange-600" />
                  Continue Learning
                </Button>
              </Link>
            ) : (
              <Button onClick={onBrowseClick} variant="ghost" size="lg" className="rounded-full bg-white font-semibold text-orange-600 shadow-md hover:bg-white/90 hover:shadow-lg transition duration-200">
                <Compass className="h-4 w-4 text-orange-600" />
                Explore Courses
              </Button>
            )}
            <Button
              onClick={onBrowseClick}
              variant="ghost"
              size="lg"
              className="rounded-full border border-white/40 bg-white/10 font-semibold text-white hover:bg-white/20 transition duration-200"
            >
              Browse Catalog
            </Button>
          </div>
        </div>

        {/* Right Content / Character Illustration + Mini Card */}
        <div className="relative flex items-center justify-center lg:justify-end">
          {/* Developer Avatar Illustration */}
          <div className="relative h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 lg:h-72 lg:w-72">
            <Image
              src="/images/student_hero_dev.png"
              alt="Developer character illustration"
              fill
              priority
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            />
          </div>

          {/* Floating Course Progress Panel */}
          {continueLearning && (
            <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md text-white sm:left-10 sm:right-10 md:left-16 md:right-16 lg:left-0 lg:right-auto lg:w-80">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                CURRENTLY LEARNING
              </div>
              <div className="mt-1 line-clamp-1 font-display text-sm font-bold">
                {continueLearning.courseTitle}
              </div>
              <div className="mt-0.5 line-clamp-1 text-xs text-white/80">
                Next up: {continueLearning.lessonTitle || "Next lesson"}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-orange-100 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">{Math.round(continueLearning.progressPercent)}%</span>
                </div>
                <div className="opacity-90">
                  <ProgressBar value={continueLearning.progressPercent} />
                </div>
              </div>
              <Link
                href={continueLearning.lessonId ? `/lesson/${continueLearning.lessonId}` : `/course/${continueLearning.courseId}`}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-orange-200 hover:text-white transition duration-200"
              >
                Go to Classroom <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
