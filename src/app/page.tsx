"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Stars,
  Trophy,
  Zap,
} from "lucide-react";
import { ProgramCard } from "@/components/marketing/ProgramCard";
import { PublicShell } from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui-kit/Button";
import { academyPrograms, faqItems, pricingPlans, quizShopItems } from "@/lib/mock-data";
import { publicEnv } from "@/lib/public-env";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.18),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Structured course platform, ready for scale
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              >
                Explore free lessons, then unlock the full course when you are ready
                to go deeper.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
              >
                Mooro Skill Up is built around categories, courses, sections, lessons,
                and tasks so learners can preview beginner content first and pay per
                course for full access later.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="mt-9 flex flex-wrap gap-4"
              >
                <Link href="/auth/register">
                  <Button variant="accent" size="lg">
                    Start learning <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button variant="outline" size="lg">
                    Explore courses
                  </Button>
                </Link>
              </motion.div>

              <div className="mt-10 flex flex-wrap gap-6">
                {[
                  { label: "Learners", value: "4.2k+" },
                  { label: "Completion boost", value: "68%" },
                  { label: "Academy programs", value: `${academyPrograms.length}` },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="font-display text-3xl font-bold">{item.value}</div>
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="relative rounded-[2rem] border border-border bg-card/80 p-6 shadow-[0_20px_80px_-32px_rgba(11,100,244,0.45)] backdrop-blur"
            >
              <div className="rounded-[1.6rem] bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                    Student command center
                  </span>
                  <Trophy className="h-5 w-5" />
                </div>
                <h2 className="mt-6 font-display text-3xl font-bold">
                  Personalized tracks, streaks, and smart unlocks
                </h2>
                <p className="mt-3 text-sm text-white/80">
                  Tailored learning paths based on selected interests like
                  Frontend, Backend, UI/UX, Data, and Product Design.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: BarChart3,
                    title: "Progress clarity",
                    body: "See what is unlocked, what is premium, and what is next.",
                  },
                  {
                    icon: Zap,
                    title: "Free-to-paid structure",
                    body: "Let learners preview free sections first, then unlock the remaining sections per course.",
                  },
                  {
                    icon: MessageCircleMore,
                    title: "WhatsApp-ready support",
                    body: "Fast contact experiences for high-trust onboarding.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Backend-ready structure",
                    body: "Frontend organized for future Django API integration.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Clear course hierarchy",
                body: "Categories, courses, sections, lessons, and tasks are structured for scale.",
              },
              {
                icon: Stars,
                title: "Preview before payment",
                body: "Free sections let learners test the teaching style before unlocking a full course.",
              },
              {
                icon: Trophy,
                title: "Certificate-ready completion",
                body: "Course completion can lead into certification once all lessons and tasks are done.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Course preview
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
                Public programs that show exactly what the academy offers
              </h2>
            </div>
            <Link href="/courses" className="hidden text-sm font-semibold text-primary md:inline-flex">
              View all courses
            </Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {academyPrograms.slice(0, 3).map((program) => (
              <ProgramCard key={program.id} program={program} compact />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Explore Free Lessons
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold">
                Start with the beginner sections before spending money
              </h2>
              <p className="mt-4 text-muted-foreground">
                Learners can preview the early sections in a course, read the roadmap,
                understand the task flow, and decide whether the full course is right for them.
              </p>
            </div>
            <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
                Unlock Full Course Access
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold">
                Pay per course to unlock all sections, tasks, and certification
              </h2>
              <p className="mt-4 text-muted-foreground">
                Once a learner pays for a course, the locked sections open up and the full
                learning path becomes available from the dashboard.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
              Pricing
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Start free, then unlock full power when you are ready
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-[2rem] border p-6 ${
                  plan.highlight
                    ? "border-accent bg-gradient-to-b from-accent/10 to-card shadow-sm"
                    : "border-border bg-card"
                }`}
              >
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {plan.tagline}
                </div>
                <h3 className="mt-4 font-display text-3xl font-bold">{plan.title}</h3>
                <div className="mt-4 font-display text-5xl font-bold">{plan.price}</div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-6 space-y-3">
                  {plan.features.slice(0, 3).map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/pricing" className="mt-6 block">
                  <Button variant={plan.highlight ? "accent" : "outline"} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                  Quiz Shop
                </div>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
                  Make quizzes more rewarding with a playful progression loop
                </h2>
              </div>
              <Link href="/quiz-shop">
                <Button variant="outline">Explore the shop</Button>
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {quizShopItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                    {item.rarity}
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-display text-2xl font-bold">{item.cost} pts</span>
                    <span className="text-sm font-medium text-primary">{item.reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                <Award className="h-3.5 w-3.5" />
                Certification
              </div>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-tight">
                Finish strong and earn a certificate learners can actually show off
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Certificates are positioned as proof of completing lessons, weekly projects, and
                the final capstone flow. Premium learners also get stronger review support before
                claiming completion.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pricing">
                  <Button variant="accent">Compare plan access</Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline">Start learning</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-gradient-to-br from-card to-accent-soft p-6 shadow-sm">
              <div className="rounded-[1.5rem] border-[8px] border-primary/90 bg-white p-6">
                <div className="rounded-[1.2rem] border border-accent px-6 py-8 text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                    MooreSkillUp x MooreTech
                  </div>
                  <div className="mt-4 font-display text-3xl font-bold text-primary">
                    Certificate of Completion
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Awarded to
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">Your learner profile</div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    For completing a roadmap, weekly assessments, project delivery, and capstone review.
                  </div>
                  <div className="mt-6 text-sm font-semibold text-accent">
                    Produced with certification support from MooreTech
                  </div>
                </div>
              </div>
              <a
                href={publicEnv.moretechUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-primary"
              >
                Visit MooreTech
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                FAQ
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
                Questions about access, personalization, and what comes next
              </h2>
              <p className="mt-4 text-muted-foreground">
                The current frontend uses mock data, but it is already being shaped
                for real Django integration later.
              </p>
            </div>
            <div className="space-y-4">
              {faqItems.slice(0, 3).map((item) => (
                <div key={item.question} className="rounded-3xl border border-border bg-card p-6">
                  <h3 className="font-display text-xl font-bold">{item.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </div>
              ))}
              <Link href="/faq">
                <Button variant="outline">View full FAQ</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-border bg-gradient-to-br from-primary via-primary-glow to-accent p-8 text-primary-foreground shadow-sm">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
                  Contact and support
                </div>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">
                  Want fast answers? Reach us by contact form or WhatsApp.
                </h2>
                <p className="mt-4 max-w-2xl text-white/80">
                  Create an account, explore the academy, or speak with us directly
                  if you want help choosing a track.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-black/15 p-6 backdrop-blur">
                <div className="text-sm text-white/75">
                  Support channel
                </div>
                <div className="mt-2 font-display text-3xl font-bold">
                  WhatsApp + Contact
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/contact">
                    <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                      Contact us
                    </Button>
                  </Link>
                  <a
                    href="https://wa.me/1234567890?text=Hello%20MooreSkillUp"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="accent">Chat on WhatsApp</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
