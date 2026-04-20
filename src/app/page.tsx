"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, BookOpen, BarChart3 } from "lucide-react";
import { Button } from "../components/ui-kit/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            MooreSkillUp
          </span>
        </Link>
        <nav className="ml-8 mr-auto hidden items-center gap-6 md:flex">
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="accent" size="sm">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Now enrolling for the Spring cohort
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Learn skills that <span className="text-accent">move you</span>{" "}
            forward.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            MooreSkillUp is a focused learning platform built around structured
            weekly modules, hands-on lessons, and clear progress so you actually
            finish what you start.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="accent">
                Create free account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                I already have one
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 grid gap-5 sm:grid-cols-3"
        >
          {[
            {
              icon: BookOpen,
              title: "Structured courses",
              text: "Weekly modules with bite-sized lessons designed to fit your schedule.",
            },
            {
              icon: BarChart3,
              title: "Track progress",
              text: "Always know where you are, what is next, and what you have completed.",
            },
            {
              icon: Sparkles,
              title: "Stay motivated",
              text: "Announcements, live Q&As, and a focused dashboard to keep you on track.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {feature.text}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      <section
        id="pricing"
        className="border-t border-border bg-gradient-to-b from-background to-card/20 px-6 py-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl"
        >
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start learning for free, upgrade when you are ready.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-accent/50 hover:shadow-md"
            >
              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Free
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Perfect for getting started
                </p>
              </div>

              <div className="mb-8">
                <span className="font-display text-5xl font-bold text-foreground">
                  $0
                </span>
                <span className="text-muted-foreground">/forever</span>
              </div>

              <Button className="mb-8 w-full" variant="outline">
                Get started
              </Button>

              <div className="space-y-4 text-sm">
                {[
                  { feature: "3 free courses", included: true },
                  { feature: "Basic progress tracking", included: true },
                  { feature: "Community forum access", included: true },
                  { feature: "Certificates", included: false },
                  { feature: "Unlimited courses", included: false },
                  { feature: "Priority support", included: false },
                ].map((item) => (
                  <div key={item.feature} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-sm">
                      {item.included ? "✓" : "×"}
                    </span>
                    <span
                      className={
                        item.included ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {item.feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative rounded-2xl border-2 border-accent bg-card p-8 shadow-lg"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                <span className="rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
                  Most Popular
                </span>
              </div>

              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Professional
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlock your full potential
                </p>
              </div>

              <div className="mb-8">
                <span className="font-display text-5xl font-bold text-foreground">
                  $29
                </span>
                <span className="text-muted-foreground">/month or $290/year</span>
              </div>

              <Link href="/register">
                <Button className="mb-8 w-full" variant="accent">
                  Start free 7-day trial
                </Button>
              </Link>

              <div className="space-y-4 text-sm">
                {[
                  "Unlimited access to all courses",
                  "Advanced progress tracking",
                  "Download certificates (PDF)",
                  "Priority email support",
                  "1-on-1 mentoring sessions",
                  "Exclusive community features",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent">
                      ✓
                    </span>
                    <span className="font-medium text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg bg-accent/10 p-4 text-sm text-accent">
                No credit card required for trial. Cancel anytime.
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="contact" className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-display text-4xl font-bold text-foreground">
            Ready to start learning?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Visit our contact page for questions or register to begin right
            away.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact">
              <Button variant="outline">Contact us</Button>
            </Link>
            <Link href="/register">
              <Button variant="accent">Get started</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
