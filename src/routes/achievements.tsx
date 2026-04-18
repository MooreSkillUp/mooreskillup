import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { BadgeIcon } from "@/components/dashboard/BadgeIcon";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { badges } from "@/lib/gamification";

export const Route = createFileRoute("/achievements")({
  component: AchievementsPage,
});

function AchievementsPage() {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const pct = Math.round((earned.length / badges.length) * 100);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rounded-2xl bg-gradient-to-br from-accent to-accent/70 p-6 text-accent-foreground shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Achievements</div>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Your badges</h1>
              <p className="mt-2 max-w-md opacity-90">
                You've earned <strong>{earned.length}</strong> of {badges.length} badges. Keep learning to unlock the rest.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <ProgressBar value={pct} label="Collection complete" />
            </div>
          </div>
        </div>

        <Section title="Earned" count={earned.length}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {earned.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 220 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center shadow-sm"
              >
                <BadgeIcon badge={b} size="lg" />
                <div>
                  <div className="font-display text-base font-bold">{b.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
                  {b.earnedAt && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                      <Award className="h-3 w-3" /> {b.earnedAt}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        <Section title="Locked" count={locked.length}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {locked.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center"
              >
                <BadgeIcon badge={b} size="lg" />
                <div>
                  <div className="flex items-center justify-center gap-1.5 font-display text-base font-bold text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> {b.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <span className="text-sm text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}
