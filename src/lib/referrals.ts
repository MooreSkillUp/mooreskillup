"use client";

import { useCallback, useEffect, useState } from "react";

import { authenticatedRequest } from "./authenticated-api";

export interface ReferralStanding {
  code: string | null;
  /** Invites who verified their email. Clicks are not counted, by design. */
  qualified: number;
  rewardsEnabled: boolean;
  earlyAccessAt: number;
  freeCourseAt: number;
  hasEarlyAccess: boolean;
  hasFreeCourse: boolean;
  referrersSoFar: number;
}

export interface LeaderboardRow {
  username: string;
  referrals: number;
}

/** Where this member stands: their link, their count, what it has earned. */
export function useReferrals(enabled = true) {
  const [standing, setStanding] = useState<ReferralStanding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    try {
      setStanding(await authenticatedRequest<ReferralStanding>("/api/auth/referrals/"));
    } catch {
      // Not a student, or not signed in. The screen simply omits the panel.
      setStanding(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { standing, isLoading, refresh };
}

/**
 * The link a member shares.
 *
 * Built from the browser's own origin so it is right on every environment
 * without a second setting to keep in step with the domain.
 */
export function referralLink(code: string | null): string {
  if (!code) return "";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/auth/register?ref=${code}`;
}

/** The message people actually paste, rather than a bare URL. */
export function referralMessage(code: string | null, opensOn?: string | null): string {
  const link = referralLink(code);
  const when = opensOn ? ` It opens on ${opensOn}.` : "";
  return `I just joined MooreSkillUp — skills beyond the classroom.${when} Join with my link and we both get in early: ${link}`;
}
