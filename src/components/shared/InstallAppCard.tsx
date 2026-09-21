"use client";

import Link from "next/link";
import { Share, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { useInstallApp } from "@/lib/install-app";

/**
 * An offer to put MooreSkillUp on the home screen.
 *
 * Shown where it makes sense — after signing up, after a first lesson — and
 * never inside the installed app, never again for a fortnight after a "not
 * now". An install banner that follows somebody around teaches them to ignore
 * the whole interface.
 *
 * On iPhone there is no prompt to fire, so it says what to tap instead. The
 * usual mistake is showing an Install button that does nothing on Safari.
 */
export function InstallAppCard({ reason }: { reason?: string }) {
  const { canPrompt, needsIosSteps, snoozed, install, dismiss } = useInstallApp();

  if (snoozed || (!canPrompt && !needsIosSteps)) return null;

  return (
    <section className="relative rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <Smartphone className="h-5 w-5 text-accent" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Put MooreSkillUp on your phone</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {reason ??
              "It opens like an app, keeps you signed in, and works on a weak connection."}
          </p>
        </div>
      </div>

      {canPrompt ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="accent" onClick={() => void install()}>
            Install the app
          </Button>
          <Link href="/install">
            <Button variant="outline">How it works</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-5">
          <ol className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">1</span>
              <span className="inline-flex items-center gap-1.5">
                Tap <Share className="h-4 w-4 text-accent" /> Share at the bottom of Safari
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">2</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">3</span>
              <span>Tap <strong>Add</strong>. Done.</span>
            </li>
          </ol>
          <Link href="/install" className="mt-4 inline-block text-sm font-semibold text-accent">
            See it with pictures →
          </Link>
        </div>
      )}
    </section>
  );
}
