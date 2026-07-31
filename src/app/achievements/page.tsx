"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";
import { FeatureGate } from "@/components/shared/FeatureGate";

export default function AchievementsPage() {
  return (
    <AppShell>
      <FeatureGate flag="achievements">
        <ComingSoonPanel
          title="Achievements are coming soon"
          body="Badges arrive once we're recording real learning activity, so what you earn reflects work you actually did."
        />
      </FeatureGate>
    </AppShell>
  );
}
