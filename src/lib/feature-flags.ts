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

/**
 * Reads platform feature flags from the public status endpoint (no auth).
 * Student pages use this to show real features vs "Coming soon".
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(buildApiUrl("/api/platform/status/"))
      .then(parseJsonSafely)
      .then((payload) => {
        if (active && payload?.features) {
          setFlags({ ...DEFAULT_FLAGS, ...payload.features });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { flags, isLoading };
}
