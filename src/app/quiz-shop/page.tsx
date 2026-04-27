import { Metadata } from "next";
import { quizShopItems } from "@/lib/mock-data";
import { Button } from "@/components/Button";
import { Award, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Quiz Shop | MooreSkillUp",
  description: "Redeem your learning points for rewards.",
};

export default function QuizShopPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
              Rewards
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Quiz Shop
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Turn your hard-earned quiz points into profile badges, streak freezes, and course discounts.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
            <Zap className="h-5 w-5 text-accent" />
            <span className="font-display font-bold">1,250 pts</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizShopItems.map((item) => (
            <div key={item.id} className="group rounded-[2rem] border border-border bg-card p-6 shadow-sm transition-all hover:border-accent/50 hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="h-8 w-8" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {item.rarity}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Cost</div>
                  <div className="font-display text-xl font-bold text-foreground">{item.cost} pts</div>
                </div>
                <Button variant="outline" size="sm">
                  Redeem
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
