"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Putting MooreSkillUp on someone's home screen.
 *
 * Android fires `beforeinstallprompt`, which can be caught and replayed later
 * at a moment that makes sense. iPhone fires nothing at all — Safari only
 * installs through Share → Add to Home Screen — so those visitors need telling,
 * not prompting. Treating both the same is why most install banners do nothing
 * on half the phones they appear on.
 */
const DISMISSED_KEY = "msu-install-dismissed";
/** A "not now" is respected for this long before asking again. */
const SNOOZE_DAYS = 14;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function snoozedUntil(): number {
  try {
    return Number(window.localStorage.getItem(DISMISSED_KEY) || 0);
  } catch {
    return 0;
  }
}

export function useInstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    // Already installed: the app is running from the home screen, so there is
    // nothing to offer. Checked before anything else so no banner ever appears
    // inside the installed app itself.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream);
    setSnoozed(Date.now() < snoozedUntil());

    const onPrompt = (event: Event) => {
      // Stop Chrome's own mini-banner so it does not compete with ours.
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event can only be used once; Chrome will fire a fresh one if the
    // person declines and becomes eligible again.
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(
        DISMISSED_KEY,
        String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      // A viewer with storage blocked simply gets asked again next visit.
    }
    setSnoozed(true);
  }, []);

  return {
    /** Android and desktop Chrome: we hold a real prompt we can replay. */
    canPrompt: Boolean(deferred) && !isStandalone,
    /** iPhone: no prompt exists, so show the three-step instructions instead. */
    needsIosSteps: isIos && !isStandalone,
    isStandalone,
    snoozed,
    install,
    dismiss,
  };
}
