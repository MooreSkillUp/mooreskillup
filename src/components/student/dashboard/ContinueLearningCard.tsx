"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";

interface ContinueLearningProps {
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string | null;
    progressPercent: number;
    lessonTitle?: string;
    level?: string;
    totalLessons?: number;
    categoryColor?: string;
  } | null;
}

export function ContinueLearningCard({ continueLearning }: ContinueLearningProps) {
  if (!continueLearning) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-card p-8 text-center">
        <h3 className="font-display text-lg font-bold text-foreground">Ready to start?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Pick a course from below or explore the catalog to begin.</p>
      </div>
    );
  }

  const defaultColor = continueLearning.categoryColor ?? "#F97316";

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-foreground">Continue Learning</h3>
        <Link href="/dashboard/courses" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left Side: Thumbnail & Title Info */}
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          {/* Card Thumbnail */}
          <div
            className="relative h-20 w-36 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center p-3 text-white font-display text-xs font-bold leading-tight"
            style={{
              background: `linear-gradient(135deg, ${defaultColor} 0%, ${defaultColor}aa 100%)`,
            }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative text-center uppercase tracking-wider line-clamp-2">
              {continueLearning.courseTitle}
            </div>
          </div>

          {/* Title and Current Progress text */}
          <div className="space-y-1">
            <h4 className="font-display text-base font-bold text-foreground line-clamp-1">
              {continueLearning.courseTitle}
            </h4>
            <p className="text-xs text-muted-foreground">
              Current Topic: <span className="font-medium text-foreground">{continueLearning.lessonTitle || "1.1 Introduction"}</span>
            </p>
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>{continueLearning.totalLessons ?? 12} lessons</span>
              <span>•</span>
              <span>{continueLearning.level ?? "Beginner"}</span>
            </div>
          </div>
        </div>

        {/* Middle: Progress Bar */}
        <div className="flex w-full flex-col gap-1 md:max-w-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{Math.round(continueLearning.progressPercent)}%</span>
          </div>
          <ProgressBar value={continueLearning.progressPercent} />
        </div>

        {/* Right: Continue button */}
        <div className="shrink-0">
          <Link href={continueLearning.lessonId ? `/lesson/${continueLearning.lessonId}` : `/course/${continueLearning.courseId}`}>
            <Button variant="accent" className="w-full sm:w-auto rounded-full font-semibold px-6 shadow-sm hover:shadow-md transition duration-200">
              <Play className="h-3.5 w-3.5 fill-white text-white" /> Continue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
