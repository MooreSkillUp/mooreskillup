"use client";

import { useState } from "react";
import { PublicShell } from "@/components/marketing/PublicShell";
import { ProgramCard } from "@/components/marketing/ProgramCard";
import { academyPrograms } from "@/lib/mock-data";

export default function CoursesPage() {
  const [query, setQuery] = useState("");

  const filtered = academyPrograms.filter((program) => {
    const haystack = `${program.title} ${program.description} ${program.branches
      .map((branch) => `${branch.title} ${branch.tools.join(" ")}`)
      .join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Course catalog
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">
            These are the academy programs we offer
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Explore the public catalog first. Progress belongs inside a learner account,
            but this page shows the programs, tracks, tools, roadmap direction, and module structure
            available on the platform.
          </p>

          <div className="mt-8">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by academy path, tool, or track"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </main>
    </PublicShell>
  );
}
