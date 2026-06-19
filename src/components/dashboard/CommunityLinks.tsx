"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

/**
 * Shows "Join community" links for the programs the signed-in student belongs to.
 * Renders nothing when no matching program has a community link configured.
 */
export function CommunityLinks({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { categories } = usePlatformTaxonomy();

  const communities = useMemo(() => {
    if (!user) return [];
    const myPrograms = new Set<string>();
    if (user.selectedInterest) myPrograms.add(user.selectedInterest);
    return categories
      .filter((category) => myPrograms.has(category.name) && category.communityUrl)
      .map((category) => ({
        id: category.id,
        program: category.name,
        url: category.communityUrl as string,
        label: category.communityLabel || "Join community",
      }));
  }, [categories, user]);

  if (!communities.length) return null;

  return (
    <div className={`rounded-3xl border border-border bg-card p-5 shadow-sm ${compact ? "" : "space-y-3"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        <Users className="h-4 w-4" /> Your community
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect with classmates and mentors in your program group.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {communities.map((community) => (
          <a
            key={community.id}
            href={community.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
          >
            <Users className="h-4 w-4" />
            {community.label}
            <span className="text-xs font-normal text-muted-foreground">· {community.program}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
