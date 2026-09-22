"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";

import type { ActiveCampaign } from "@/lib/student";

/**
 * The campaign behind a discounted price, and how long it lasts.
 *
 * The deadline is the point: "30% off" is a nice-to-know, "30% off, ends in
 * 2 days 4 hours" is a reason to decide now. The countdown can be switched off
 * per campaign for promotions where urgency would be wrong.
 */
function left(endsAt: number) {
  const ms = endsAt - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms / 3600000) % 24);
  const minutes = Math.floor((ms / 60000) % 60);
  if (days > 0) return `${days} ${days === 1 ? "day" : "days"} ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CampaignNotice({ campaign }: { campaign: ActiveCampaign }) {
  const endsAt = new Date(campaign.endsAt).getTime();
  const [remaining, setRemaining] = useState(() => left(endsAt));

  useEffect(() => {
    if (!campaign.showCountdown) return;
    setRemaining(left(endsAt));
    // Once a minute is enough for a deadline measured in days, and kinder to a
    // phone than once a second.
    const id = setInterval(() => setRemaining(left(endsAt)), 60000);
    return () => clearInterval(id);
  }, [campaign.showCountdown, endsAt]);

  return (
    <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
      <div className="flex items-center gap-1.5 font-semibold text-accent">
        <Tag className="h-4 w-4" />
        {campaign.name} · {campaign.percentOff}% off
      </div>
      {campaign.showCountdown && remaining && (
        <div className="mt-0.5 text-muted-foreground">Ends in {remaining}</div>
      )}
    </div>
  );
}
