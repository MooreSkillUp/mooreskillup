"use client";

interface DailyGoalProps {
  targetMinutes?: number;
  earnedMinutes?: number;
}

export function DailyGoal({ targetMinutes = 30, earnedMinutes = 18 }: DailyGoalProps) {
  const pct = Math.min(100, Math.round((earnedMinutes / targetMinutes) * 100));
  // SVG circle math
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Daily Goal</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {pct}% done
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Ring */}
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/30"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#F97316"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-foreground">{earnedMinutes}m</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              of {targetMinutes}m
            </span>
          </div>
        </div>

        {/* Label */}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {pct >= 100 ? "🎉 Goal complete!" : `${targetMinutes - earnedMinutes} min left`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pct >= 100
              ? "Amazing work — you hit your daily target!"
              : "Keep going to hit your daily learning goal."}
          </p>
        </div>
      </div>
    </div>
  );
}
