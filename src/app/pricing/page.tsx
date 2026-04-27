import { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { pricingPlans } from "@/lib/mock-data";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Pricing | MooreSkillUp",
  description: "Simple, transparent pricing for everyone.",
};

export default function PricingPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
            Pricing
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Start free, then unlock full power
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-muted-foreground">
            Choose the plan that fits your learning journey. Upgrade anytime when you are ready to go deeper.
          </p>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[2rem] border p-8 flex flex-col ${
                plan.highlight
                  ? "border-accent bg-gradient-to-b from-accent/10 to-card shadow-lg relative"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {plan.tagline}
              </div>
              <h3 className="mt-4 font-display text-3xl font-bold">{plan.title}</h3>
              <div className="mt-4 font-display text-5xl font-bold">{plan.price}</div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              
              <div className="mt-8 space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                variant={plan.highlight ? "accent" : "outline"} 
                className="w-full mt-8"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
