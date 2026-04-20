"use client";

import { motion } from "framer-motion";
import { Gem, Trophy, Zap } from "lucide-react";
import { PublicShell } from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui-kit/Button";
import { quizShopItems } from "@/lib/mock-data";

const rarityStyles = {
  Rare: "from-sky-500/20 to-primary/10 border-primary/30",
  Epic: "from-violet-500/20 to-accent/10 border-violet-500/30",
  Legendary: "from-accent/20 to-orange-500/20 border-accent/40",
} as const;

export default function QuizShopPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.18),transparent_28%)] p-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Gamified progression
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold tracking-tight">
              Spend points on perks, retries, and premium challenge drops
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The Quiz Shop turns quiz performance into momentum. Earn points,
              unlock perks, and keep your learning loop exciting.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="rounded-2xl border border-border bg-card/70 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Current balance
                </div>
                <div className="mt-1 font-display text-2xl font-bold">1,840 pts</div>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Next reward
                </div>
                <div className="mt-1 font-display text-2xl font-bold">Mentor Pass</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {quizShopItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`rounded-3xl border bg-gradient-to-b p-6 shadow-sm ${rarityStyles[item.rarity]}`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.rarity}
                </span>
                <Gem className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-6 rounded-2xl bg-card/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Reward
                </div>
                <div className="mt-1 font-semibold">{item.reward}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-2xl font-bold">{item.cost} pts</span>
                  <Button variant="accent" size="sm">
                    Redeem
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="mt-14 grid gap-6 rounded-[2rem] border border-border bg-card p-8 lg:grid-cols-3">
          {[
            {
              title: "Pass quizzes",
              body: "Score points by completing quizzes and challenge packs.",
            },
            {
              title: "Build streaks",
              body: "Consistent learning activity boosts your earning pace.",
            },
            {
              title: "Redeem upgrades",
              body: "Use rewards to unlock retries, mentor reviews, and rare drops.",
            },
          ].map((step, index) => (
            <div key={step.title}>
              <div className="font-display text-4xl font-bold text-primary/20">
                0{index + 1}
              </div>
              <h3 className="mt-3 font-display text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </section>
      </main>
    </PublicShell>
  );
}
