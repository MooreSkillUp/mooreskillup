import { useEffect, useState } from "react";
import { buildApiUrl, parseJsonSafely } from "./authenticated-api";

export interface FeatureFlags {
  reviews: boolean;
  certificates: boolean;
  recommendations: boolean;
  achievements: boolean;
  leaderboard: boolean;
  quiz: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  reviews: true,
  certificates: true,
  recommendations: true,
  achievements: false,
  leaderboard: false,
  quiz: false,
};

export interface LegalSummary {
  version: string;
  termsUrl: string;
  privacyUrl: string;
  refundUrl: string;
  termsPublished: boolean;
  privacyPublished: boolean;
  refundPublished: boolean;
}

/** Where the platform is in its own life: counting down, or open. */
export interface LaunchState {
  state: "pre_launch" | "founding_beta" | "live";
  countdownEnabled: boolean;
  /** ISO timestamp, or null when no date has been set yet. */
  launchAt: string | null;
  headline: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Where the community lives — a WhatsApp invite, usually. */
  communityUrl: string;
  communityLabel: string;
}

export interface PlatformStatus {
  siteName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  studentRegistrationOpen: boolean;
  /** False means course purchases are paused — said before someone clicks Buy. */
  paymentsEnabled: boolean;
  /** Hours we tell people to expect a support reply within. 0 promises nothing. */
  supportResponseHours: number;
  /** False closes sign-in to students. Admins are never locked out. */
  signInEnabled: boolean;
  /** The legal pages this platform hosts, and which have been published. */
  legal: LegalSummary;
  launch: LaunchState;
  features: FeatureFlags;
}

const DEFAULT_STATUS: PlatformStatus = {
  siteName: "MooreSkillUp",
  maintenanceMode: false,
  maintenanceMessage: "",
  studentRegistrationOpen: true,
  paymentsEnabled: true,
  supportResponseHours: 24,
  signInEnabled: true,
  legal: {
    version: "",
    termsUrl: "/legal/terms",
    privacyUrl: "/legal/privacy",
    refundUrl: "/legal/refund",
    termsPublished: false,
    privacyPublished: false,
    refundPublished: false,
  },
  // If the status call fails we assume the platform is open: a countdown shown
  // to someone who should be learning is worse than a sign-up form shown a few
  // hours early, and the server refuses early registrations anyway.
  launch: {
    state: "live",
    countdownEnabled: false,
    launchAt: null,
    headline: "",
    message: "",
    ctaLabel: "",
    ctaUrl: "",
    communityUrl: "",
    communityLabel: "",
  },
  features: DEFAULT_FLAGS,
};

/**
 * The public status of the platform: its name, whether it's in maintenance, and
 * which features are on. No auth — it's what the app needs before anyone signs
 * in.
 *
 * The endpoint always carried the maintenance message; nothing read it, so
 * turning maintenance on gave students failed requests instead of an
 * explanation.
 */
export function usePlatformStatus() {
  const [status, setStatus] = useState<PlatformStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Never from cache: when maintenance goes on, a stale "we're fine" answer
    // means students keep hitting an API that is refusing them.
    fetch(buildApiUrl("/api/platform/status/"), { cache: "no-store" })
      .then(parseJsonSafely)
      .then((payload) => {
        if (!active || !payload) return;
        const data = payload as Partial<PlatformStatus>;
        setStatus({
          siteName: data.siteName || DEFAULT_STATUS.siteName,
          maintenanceMode: Boolean(data.maintenanceMode),
          maintenanceMessage: data.maintenanceMessage || "",
          studentRegistrationOpen: data.studentRegistrationOpen ?? true,
          paymentsEnabled: data.paymentsEnabled ?? true,
          supportResponseHours: data.supportResponseHours ?? 0,
          signInEnabled: data.signInEnabled ?? true,
          legal: { ...DEFAULT_STATUS.legal, ...(data.legal ?? {}) },
          launch: { ...DEFAULT_STATUS.launch, ...(data.launch ?? {}) },
          features: { ...DEFAULT_FLAGS, ...(data.features ?? {}) },
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { status, isLoading };
}

/**
 * Just the feature flags, for pages that only care about those.
 * Student pages use this to show real features vs "Coming soon".
 */
export function useFeatureFlags() {
  const { status, isLoading } = usePlatformStatus();
  return { flags: status.features, isLoading };
}
