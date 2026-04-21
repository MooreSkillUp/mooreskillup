"use client";

import { PublicShell } from "@/components/marketing/PublicShell";
import { ComingSoonPanel } from "@/components/shared/ComingSoonPanel";

export default function ComingSoonPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <ComingSoonPanel
          title="This feature is being prepared"
          body="We are keeping the structure in place, but this part of Mooro Skill Up is not active yet."
          backHref="/"
          backLabel="Back home"
        />
      </main>
    </PublicShell>
  );
}
