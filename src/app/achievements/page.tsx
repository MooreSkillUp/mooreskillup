"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";

export default function AchievementsPage() {
  return (
    <AppShell>
      <ComingSoonPanel
        title="Achievements are coming soon"
        body="Badge and achievement logic will come back later. For now we are focusing on the core course platform experience."
      />
    </AppShell>
  );
}
