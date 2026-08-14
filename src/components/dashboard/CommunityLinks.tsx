"use client";

import { useMemo } from "react";
import { ArrowUpRight, MessagesSquare, Users } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { usePlatformTaxonomy } from "@/lib/taxonomy";

/**
 * The community group for the programme a student belongs to.
 *
 * Renders nothing unless their programme actually has a link configured — an
 * empty "join your community" box with nothing to join is worse than no box.
 *
 * Built as a single invitation rather than a card of pill buttons: a student
 * belongs to one programme, so a row of chips implied a choice that does not
 * exist and read as a filter bar rather than a door.
 */
export function CommunityLinks() {
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
    <section className="space-y-3">
      {communities.map((community) => (
        <a
          key={community.id}
          href={community.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/40"
        >
          {/* A wash keyed to the accent, so it reads as an invitation without
              becoming a second orange block competing with the banner. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,var(--color-accent)/8%,transparent_60%)]"
          />

          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <MessagesSquare className="h-6 w-6" />
          </span>

          <span className="relative min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{community.label}</span>
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                <Users className="h-3 w-3" />
                {community.program}
              </span>
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Ask questions, share what you&apos;re building, and hear about live sessions first.
            </span>
          </span>

          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all group-hover:border-accent/40 group-hover:bg-accent group-hover:text-accent-foreground">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </a>
      ))}
    </section>
  );
}
