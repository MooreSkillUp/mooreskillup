"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";

export default function DashboardQuizShopPage() {
  return (
    <AppShell>
      <ComingSoonPanel
        title="Quiz Shop is coming soon"
        body="Quiz Shop stays active on the landing page for now, but the student dashboard shortcut is intentionally paused until the full gamification flow is ready."
      />
    </AppShell>
  );
}
