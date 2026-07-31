"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";
import { FeatureGate } from "@/components/shared/FeatureGate";

export default function LeaderboardPage() {
  return (
    <AppShell>
      <FeatureGate flag="leaderboard">
        <ComingSoonPanel
          title="Leaderboard is coming soon"
          body="Rankings arrive once we're recording real learning activity, so the board reflects genuine progress rather than a placeholder."
        />
      </FeatureGate>
    </AppShell>
  );
}
