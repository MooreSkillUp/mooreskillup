"use client";

import { PublicShell } from "@/components/marketing/PublicShell";
import { faqItems } from "@/lib/mock-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-display text-5xl font-bold tracking-tight">
            Questions learners ask before they commit
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to understand the academy experience, access
            rules, and how personalization works before the backend arrives.
          </p>
        </div>

        <div className="mt-12 rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-6">
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="rounded-2xl border border-border px-4"
              >
                <AccordionTrigger className="text-left font-display text-lg font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </PublicShell>
  );
}
