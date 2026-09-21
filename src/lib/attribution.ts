"use client";

/**
 * Where somebody came from, remembered until they sign up.
 *
 * The campaign tags are on the link they clicked, but sign-up happens several
 * pages later — by which point the URL says nothing. So the first page they
 * land on stores them, and registration reads them back.
 *
 * Kept in sessionStorage on purpose: it lasts the visit, which is the span that
 * matters, and it disappears afterwards rather than following somebody around.
 * First touch wins, so a person who arrives from a flyer and later clicks an ad
 * is still credited to the flyer that actually found them.
 */
const KEY = "msu-attribution";

export interface Attribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

const EMPTY: Attribution = { utmSource: "", utmMedium: "", utmCampaign: "" };

function read(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Attribution>) };
  } catch {
    // Private windows and blocked site data both throw here. Attribution is
    // worth having, never worth breaking a signup over.
    return EMPTY;
  }
}

/** Call once on landing. Does nothing when the visit is already attributed. */
export function captureAttribution(search: string): void {
  if (typeof window === "undefined") return;
  const existing = read();
  if (existing.utmSource) return;

  const params = new URLSearchParams(search);
  const next: Attribution = {
    utmSource: (params.get("utm_source") || "").slice(0, 80),
    utmMedium: (params.get("utm_medium") || "").slice(0, 80),
    utmCampaign: (params.get("utm_campaign") || "").slice(0, 120),
  };
  if (!next.utmSource && !next.utmMedium && !next.utmCampaign) return;

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do; the signup still works, it just arrives unattributed.
  }
}

export function getAttribution(): Attribution {
  return read();
}
