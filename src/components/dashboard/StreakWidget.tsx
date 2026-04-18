import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { streakHistory, userStats } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function StreakWidget() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Daily streak</h3>
          <p className="text-sm text-muted-foreground">Keep showing up — consistency wins.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-accent">
          <Flame className="h-4 w-4" />
          <span className="text-sm font-bold">{userStats.streak} days</span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">
        {streakHistory.map((d, i) => (
          <motion.div
            key={d.day}
            initial={{ scaleY: 0.4, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-md",
                d.active
                  ? "bg-gradient-to-b from-accent to-accent/70 text-accent-foreground"
                  : "bg-muted text-muted-foreground/40",
              )}
            >
              {d.active ? <Flame className="h-4 w-4" /> : <span className="text-xs">·</span>}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{d.day}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
        <div>
          <div className="text-muted-foreground">Longest streak</div>
          <div className="font-display text-base font-bold text-foreground">{userStats.longestStreak} days</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">Total points</div>
          <div className="font-display text-base font-bold text-foreground">{userStats.points.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
