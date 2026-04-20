"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui-kit/Button";
import { pricingPlans } from "@/lib/mock-data";

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Pricing built for momentum
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight">
            Pick the plan that matches how fast you want to grow
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, move to Pro when you want full access, or choose Premium
            when you want mentorship and deeper accountability.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`rounded-3xl border p-8 shadow-sm ${
                plan.highlight
                  ? "border-accent bg-gradient-to-b from-accent/10 to-card shadow-accent/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {plan.tagline}
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold">{plan.title}</h2>
              <div className="mt-4 font-display text-5xl font-bold">{plan.price}</div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {plan.description}
              </p>

              <Link href="/auth/register" className="mt-8 block">
                <Button variant={plan.highlight ? "accent" : "outline"} className="w-full">
                  {plan.cta}
                </Button>
              </Link>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </PublicShell>
  );
}
