"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";
import { FeatureGate } from "@/components/shared/FeatureGate";

export default function DashboardQuizShopPage() {
  return (
    <AppShell>
      <FeatureGate flag="quiz">
        <ComingSoonPanel
          title="Quiz Shop is coming soon"
          body="Quizzes and the rewards you spend them on land together, once the learning activity behind them is being tracked."
        />
      </FeatureGate>
    </AppShell>
  );
}
