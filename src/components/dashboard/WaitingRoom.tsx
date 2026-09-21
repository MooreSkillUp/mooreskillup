"use client";

import { CalendarClock, MessageCircle, Share2, Trophy } from "lucide-react";

import { ReferralPanel } from "@/components/dashboard/ReferralPanel";
import { InstallAppCard } from "@/components/shared/InstallAppCard";
import { Button } from "@/components/ui-kit/Button";
import type { LaunchState } from "@/lib/feature-flags";
import { useFeedback } from "@/lib/feedback";

/**
 * What a founding member sees between signing up and launch day.
 *
 * Courses are shut until the platform opens, so the ordinary dashboard would be
 * telling them to start their first course — something they cannot do. This
 * says where they stand instead: their number, when the doors open, and the two
 * things they can usefully do today.
 */
export function WaitingRoom({
  name,
  number,
  launch,
}: {
  name?: string;
  number: number | null;
  launch: LaunchState;
}) {
  const { notifySuccess } = useFeedback();
  const opens = launch.launchAt ? new Date(launch.launchAt) : null;
  const opensReadable =
    opens && !Number.isNaN(opens.getTime())
      ? opens.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.origin;
    const text = `I just joined MooreSkillUp — skills beyond the classroom. It opens${
      opensReadable ? ` on ${opensReadable}` : " soon"
    }. ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MooreSkillUp", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      notifySuccess("Copied", "Paste it anywhere you like.");
    } catch {
      // A cancelled share sheet is not a failure and needs no message.
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <section className="rounded-[2rem] border border-border bg-card p-7 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
          <Trophy className="h-6 w-6 text-accent" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
          You&apos;re in{name ? `, ${name}` : ""}.
        </h1>
        {number !== null ? (
          <p className="mt-2 text-lg">
            You are <strong className="text-accent">founding member #{number}</strong>.
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">Your account is ready.</p>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Nothing else to do — this same login opens your dashboard on launch day, with every
          course in it. We&apos;ll email you the moment it does.
        </p>
      </section>

      {opensReadable && (
        <section className="flex items-center gap-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </span>
          <div>
            <div className="font-medium">Courses open {opensReadable}</div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Founding members get in before everyone else.
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {launch.communityUrl && (
          <a
            href={launch.communityUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-start gap-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm transition-colors hover:border-accent"
          >
            <MessageCircle className="h-5 w-5 text-accent" />
            <span className="font-medium">{launch.communityLabel || "Join the community"}</span>
            <span className="text-sm text-muted-foreground">
              Meet the other founding members and the teachers before we open.
            </span>
          </a>
        )}
        <button
          type="button"
          onClick={() => void share()}
          className="flex flex-col items-start gap-2 rounded-[2rem] border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-accent"
        >
          <Share2 className="h-5 w-5 text-accent" />
          <span className="font-medium">Tell a friend</span>
          <span className="text-sm text-muted-foreground">
            The earlier they join, the lower their founding number.
          </span>
        </button>
      </section>

      <ReferralPanel opensOn={opensReadable} />

      <InstallAppCard reason="So it is one tap away when the courses open." />

      {launch.ctaLabel && launch.ctaUrl && (
        <div className="text-center">
          <a href={launch.ctaUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">{launch.ctaLabel}</Button>
          </a>
        </div>
      )}
    </div>
  );
}
