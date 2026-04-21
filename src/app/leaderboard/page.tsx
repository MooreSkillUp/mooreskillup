"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";

export default function LeaderboardPage() {
  return (
    <AppShell>
      <ComingSoonPanel
        title="Leaderboard is coming soon"
        body="The leaderboard structure stays in the project, but we are not making it active until the course and progress system is fully ready."
      />
    </AppShell>
  );
}
