"use client";

import { Check, Copy, Gift, Share2, Ticket } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { referralLink, referralMessage, useReferrals } from "@/lib/referrals";

/**
 * What a member's link has earned, and what it would take to earn the next
 * thing.
 *
 * A bare "share this link" asks somebody to spend their own reputation for
 * nothing. The rewards are the point, so they are on the screen next to the
 * link, with the distance to the next one stated rather than implied.
 *
 * Counts are invites who verified their email. A click is not a referral: it is
 * something anyone can produce by refreshing their own link.
 */
export function ReferralPanel({ opensOn }: { opensOn?: string | null }) {
  const { standing } = useReferrals();
  const { notifySuccess } = useFeedback();
  const [copied, setCopied] = useState(false);

  if (!standing?.code) return null;

  const link = referralLink(standing.code);
  const next = standing.rewardsEnabled
    ? !standing.hasEarlyAccess
      ? { at: standing.earlyAccessAt, what: "early access before other founding members" }
      : !standing.hasFreeCourse
        ? { at: standing.freeCourseAt, what: "a free course" }
        : null
    : null;
  const toGo = next ? Math.max(0, next.at - standing.qualified) : 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifySuccess("Here is your link", link);
    }
  };

  const share = async () => {
    const text = referralMessage(standing.code, opensOn);
    try {
      if (navigator.share) {
        await navigator.share({ title: "MooreSkillUp", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      notifySuccess("Copied", "Paste it in a chat or on your status.");
    } catch {
      // A cancelled share sheet is not a failure and needs no message.
    }
  };

  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <Gift className="h-5 w-5 text-accent" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Invite your friends</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {standing.qualified === 0
              ? "Nobody has joined through your link yet."
              : `${standing.qualified} ${standing.qualified === 1 ? "person has" : "people have"} joined through your link.`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm">
          {link}
        </code>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="accent" onClick={() => void share()}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {standing.rewardsEnabled && (
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <Reward
            done={standing.hasEarlyAccess}
            count={standing.qualified}
            at={standing.earlyAccessAt}
            label="Get in before the other founding members"
          />
          <Reward
            done={standing.hasFreeCourse}
            count={standing.qualified}
            at={standing.freeCourseAt}
            label="A course on us, free"
          />
          {next && toGo > 0 && (
            <p className="pt-1 text-sm text-muted-foreground">
              {toGo} more {toGo === 1 ? "friend" : "friends"} and you unlock {next.what}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Reward({
  done,
  count,
  at,
  label,
}: {
  done: boolean;
  count: number;
  at: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : <Ticket className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{label}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.min(100, at ? (count / at) * 100 : 0)}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {Math.min(count, at)}/{at}
      </span>
    </div>
  );
}
