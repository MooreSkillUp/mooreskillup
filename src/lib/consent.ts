"use client";

import { useEffect, useState } from "react";

/**
 * Whether this visitor has agreed to analytics and advertising cookies.
 *
 * The NDPA and the NDPC's GAID require asking before tracking that sends data
 * to Google and Meta. Cookies the app needs to work — staying signed in, the
 * theme — are not covered by this and never wait for it.
 *
 * Kept in localStorage, per browser, because the question comes before anyone
 * has an account. The version lets us ask again if what we use changes.
 */
export type Consent = "granted" | "denied";

const KEY = "msu-cookie-consent";
const VERSION = 1;
const EVENT = "msu:consent-change";

interface Stored {
  choice: Consent;
  version: number;
  at: string;
}

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Stored>;
    if (stored.version !== VERSION) return null;
    return stored.choice === "granted" || stored.choice === "denied" ? stored.choice : null;
  } catch {
    // Blocked site data: ask every visit rather than assume a yes.
    return null;
  }
}

export function writeConsent(choice: Consent): void {
  const previous = readConsent();
  try {
    const stored: Stored = { choice, version: VERSION, at: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // The choice still applies for this page view through the event below.
  }
  window.dispatchEvent(new CustomEvent<Consent>(EVENT, { detail: choice }));

  if (choice === "denied" && previous === "granted") {
    // A script that has loaded cannot be unloaded. Clearing its cookies and
    // reloading is the only honest way to make "no" take effect now.
    clearTrackingCookies();
    window.location.reload();
  }
}

/**
 * Removes Google's and Meta's cookies. Called when consent is withdrawn and
 * again on every page load while it stays withdrawn: Google Analytics rewrites
 * its session cookie as the page unloads, so a single clear before the reload
 * does not hold.
 */
export function clearTrackingCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => name.startsWith("_ga") || name === "_gid" || name.startsWith("_fb"));
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/**
 * The visitor's choice. `undefined` until the browser has been read, so the
 * server render and the first client render agree and nothing flashes.
 */
export function useConsent(): Consent | null | undefined {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (event: Event) => setConsent((event as CustomEvent<Consent>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return consent;
}
