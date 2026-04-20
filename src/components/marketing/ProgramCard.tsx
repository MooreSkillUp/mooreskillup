"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FolderTree } from "lucide-react";
import Link from "next/link";
import type { AcademyProgram } from "@/lib/mock-data";
import { Button } from "@/components/ui-kit/Button";

export function ProgramCard({
  program,
  compact = false,
}: {
  program: AcademyProgram;
  compact?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="overflow-hidden rounded-[1.8rem] border border-border bg-card shadow-sm"
    >
      <div className={`bg-gradient-to-br ${program.cover} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur">
            {program.iconLabel}
          </div>
          <FolderTree className="h-5 w-5 text-white/80" />
        </div>
        <h3 className="mt-6 font-display text-2xl font-bold">{program.title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/80">{program.description}</p>
      </div>

      <div className="space-y-4 p-6">
        <div className="space-y-3">
          {program.branches.slice(0, compact ? 2 : 3).map((branch) => (
            <div key={branch.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="font-display text-lg font-bold">{branch.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{branch.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {branch.tools.slice(0, 4).map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="rounded-2xl bg-muted/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Structure
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {program.branches[0]?.weeklyFocus.slice(0, 4).map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {program.branches.length} learning branches
          </span>
          <Link href="/auth/register">
            <Button variant="outline" size="sm">
              Start this path <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
