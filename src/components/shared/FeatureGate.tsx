"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppLoader } from "@/components/shared/AppLoader";
import { useFeatureFlags, type FeatureFlags } from "@/lib/feature-flags";

/**
 * Hides a page behind its platform feature flag.
 *
 * The sidebar already omits links for features that are switched off, but a
 * direct URL, a bookmark or a stale link would still land someone on a page
 * offering something the platform can't do. This closes that door: flag off
 * means the route quietly returns you to the dashboard.
 *
 * A Super Admin controls these in Admin Settings.
 */
export function FeatureGate({
  flag,
  children,
  fallbackHref = "/dashboard",
}: {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallbackHref?: string;
}) {
  const { flags, isLoading } = useFeatureFlags();
  const router = useRouter();
  const enabled = flags[flag];

  useEffect(() => {
    if (!isLoading && !enabled) router.replace(fallbackHref);
  }, [enabled, fallbackHref, isLoading, router]);

  // Render nothing rather than the page while we decide — flashing a feature
  // the platform has turned off, then yanking it away, is worse than a beat of
  // loading.
  if (isLoading) return <AppLoader label="Loading" />;
  if (!enabled) return null;

  return <>{children}</>;
}
