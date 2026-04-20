"use client";

import { motion } from "framer-motion";
import { Trophy, Flame, Crown, Medal } from "lucide-react";
import { AppShell } from "../../components/dashboard/AppShell";
import { leaderboard, userStats } from "../../lib/gamification";
import { cn } from "../../lib/utils";

export default function LeaderboardPage() {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-white/80">
                Leaderboard
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
                This month's top learners
              </h1>
              <p className="mt-2 max-w-md text-white/85">
                You're <strong>#{userStats.rank}</strong> with {userStats.points.toLocaleString()} points.
                Climb by completing lessons and passing quizzes.
              </p>
            </div>
            <div className="flex gap-3">
              <Stat label="Your rank" value={`#${userStats.rank}`} />
              <Stat label="Your points" value={userStats.points.toLocaleString()} />
            </div>
          </div>
        </div>

        {/* Top 3 podium */}
        <div className="grid gap-4 sm:grid-cols-3">
          {top3.map((entry, i) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative overflow-hidden rounded-xl border p-5 text-center shadow-sm",
                i === 0 && "border-accent bg-gradient-to-b from-accent/15 to-card sm:order-2 sm:scale-105",
                i === 1 && "border-border bg-card sm:order-1",
                i === 2 && "border-border bg-card sm:order-3",
              )}
            >
              {i === 0 && <Crown className="absolute right-3 top-3 h-5 w-5 text-accent" />}
              <div
                className={cn(
                  "mx-auto flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold",
                  i === 0 && "bg-accent text-accent-foreground",
                  i === 1 && "bg-primary/15 text-primary",
                  i === 2 && "bg-muted text-foreground",
                )}
              >
                {entry.avatar}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                #{entry.rank}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold">{entry.name}</div>
              <div className="mt-2 flex items-center justify-center gap-3 text-sm">
                <span className="font-semibold text-primary">{entry.points.toLocaleString()} pts</span>
                <span className="flex items-center gap-1 text-accent">
                  <Flame className="h-3.5 w-3.5" /> {entry.streak}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Remaining list */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Trophy className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base font-semibold">All rankings</h2>
          </div>
          <ul className="divide-y divide-border">
            {rest.map((entry, i) => (
              <motion.li
                key={entry.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5",
                  entry.isCurrentUser && "bg-primary/5",
                )}
              >
                <div className="flex w-8 items-center justify-center font-display text-sm font-bold text-muted-foreground">
                  {entry.rank <= 3 ? <Medal className="h-4 w-4 text-accent" /> : entry.rank}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                  {entry.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {entry.name}
                    {entry.isCurrentUser && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {entry.streak} day streak
                    </span>
                  </div>
                </div>
                <div className="font-display text-base font-bold text-foreground">
                  {entry.points.toLocaleString()}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">pts</span>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/15 px-4 py-3 text-center backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-white/75">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}