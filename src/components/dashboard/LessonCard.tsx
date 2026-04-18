import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, PlayCircle, Clock } from "lucide-react";
import type { Lesson } from "@/lib/mock-data";
import { Button } from "@/components/ui-kit/Button";
import { cn } from "@/lib/utils";

export function LessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const locked = lesson.status === "locked";
  const completed = lesson.status === "completed";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
        locked && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            completed && "bg-success/15 text-success",
            !completed && !locked && "bg-accent/15 text-accent",
            locked && "bg-muted text-muted-foreground",
          )}
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : locked ? (
            <Lock className="h-4.5 w-4.5" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lesson {index + 1}
          </div>
          <div className="truncate font-medium text-foreground">{lesson.title}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lesson.duration}
          </div>
        </div>
      </div>
      {locked ? (
        <Button variant="subtle" size="sm" disabled>
          <Lock className="h-4 w-4" /> Locked
        </Button>
      ) : (
        <Link to="/lesson/$id" params={{ id: lesson.id }}>
          <Button variant={completed ? "outline" : "accent"} size="sm">
            {completed ? "Review" : "Start lesson"}
          </Button>
        </Link>
      )}
    </div>
  );
}
