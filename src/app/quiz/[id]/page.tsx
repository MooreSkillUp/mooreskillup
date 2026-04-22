"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";

export default function QuizPage() {
  return (
    <AppShell>
      <ComingSoonPanel
        title="Quiz is coming soon"
        body="Quiz pages remain in the codebase, but quiz interactions are disabled until the course completion flow is finalized."
        backHref="/courses"
        backLabel="Back to courses"
      />
    </AppShell>
  );
}
