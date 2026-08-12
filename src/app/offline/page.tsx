"use client";

import { WifiOff } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui-kit/Button";

/**
 * Shown by the service worker when a page is requested with no connection.
 *
 * Without it the browser's own error page appears, which makes the app look
 * broken rather than offline — a meaningful difference for students on patchy
 * mobile data.
 */
export default function OfflinePage() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background px-6 text-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <BrandLogo href={null} size="md" align="center" />

      <div className="flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="font-display text-xl font-bold">You&apos;re offline</h1>
        <p className="max-w-xs text-balance text-sm leading-relaxed text-muted-foreground">
          MooreSkillUp needs a connection to load your courses. Your progress is
          saved — nothing is lost.
        </p>
      </div>

      <Button variant="accent" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
