import { Metadata } from "next";
import { faqItems } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "FAQ | MooreSkillUp",
  description: "Frequently asked questions about our learning platform.",
};

export default function FAQPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Support
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-muted-foreground">
            Find answers to common questions about courses, access, and certification.
          </p>
        </div>
        
        <div className="space-y-6">
          {faqItems.map((item, i) => (
            <div key={i} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-xl font-bold">{item.question}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
