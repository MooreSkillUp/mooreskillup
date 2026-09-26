"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { useEffect } from "react";

import { useConsent, writeConsent } from "@/lib/consent";

/** Analytics is only asked about when there is analytics to ask about. */
export const TRACKING_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID,
);

/**
 * The first-visit question. Both answers are one tap and equally easy to find:
 * a banner that makes "no" harder than "yes" is not asking.
 */
export function CookieBanner() {
  const consent = useConsent();
  const showing = TRACKING_CONFIGURED && consent === null;

  /**
   * Keep the page's own content clear of the banner.
   *
   * It is fixed to the bottom of the screen, and on a phone that put it over
   * the end of the sign-up form: tapping "Create account" hit the banner
   * instead, and nothing happened. A visitor could not sign up without first
   * working out that the bar had to be dismissed.
   */
  useEffect(() => {
    if (!showing || typeof document === "undefined") return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "9.5rem";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [showing]);

  if (!showing) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:gap-5">
        <Cookie className="hidden h-6 w-6 shrink-0 text-accent sm:block" />
        <p className="text-sm text-muted-foreground">
          We use cookies to see which of our posts and ads bring people to MooreSkillUp. Cookies
          that keep you signed in are always on.{" "}
          <Link href="/legal/privacy" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => writeConsent("denied")}>
            Only necessary
          </Button>
          <Button variant="accent" size="sm" className="flex-1 sm:flex-none" onClick={() => writeConsent("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Where a choice can be changed later: the Privacy Policy and Settings. */
export function CookieChoices() {
  const consent = useConsent();

  if (!TRACKING_CONFIGURED) {
    return (
      <p className="text-sm text-muted-foreground">
        MooreSkillUp is not using analytics or advertising cookies right now. Only the cookies that
        keep you signed in are in use.
      </p>
    );
  }

  const state =
    consent === "granted"
      ? "You allowed analytics and advertising cookies."
      : consent === "denied"
        ? "You chose necessary cookies only."
        : "You have not chosen yet.";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {state} Cookies that keep you signed in are always on.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant={consent === "denied" ? "primary" : "outline"}
          size="sm"
          disabled={consent === "denied"}
          onClick={() => writeConsent("denied")}
        >
          Only necessary
        </Button>
        <Button
          variant={consent === "granted" ? "primary" : "outline"}
          size="sm"
          disabled={consent === "granted"}
          onClick={() => writeConsent("granted")}
        >
          Allow analytics
        </Button>
      </div>
    </div>
  );
}
