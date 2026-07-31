"use client";

import Link from "next/link";
import { Cloud, Code, Cpu, Palette, Smartphone, Sparkles, Terminal, Wrench } from "lucide-react";

import type { StudentTrack } from "@/lib/student";

/**
 * Icon and colour per track, matched on the category name an admin actually
 * created. Unknown names fall through to a neutral default rather than being
 * left blank, so adding a category never leaves a hole in the grid.
 */
const TRACK_STYLES: { match: RegExp; icon: typeof Code; className: string }[] = [
  { match: /web|frontend|front-end/i, icon: Code, className: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20" },
  { match: /backend|back-end|language|programming/i, icon: Terminal, className: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" },
  { match: /ai|data|machine/i, icon: Sparkles, className: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20" },
  { match: /cloud|devops/i, icon: Cloud, className: "text-sky-500 bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20" },
  { match: /mobile|android|ios/i, icon: Smartphone, className: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20" },
  { match: /design|graphic|ui|ux/i, icon: Palette, className: "text-pink-500 bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20" },
  { match: /engineer/i, icon: Wrench, className: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20" },
];

const DEFAULT_STYLE = {
  icon: Cpu,
  className: "text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20",
};

function styleFor(name: string) {
  return TRACK_STYLES.find((style) => style.match.test(name)) ?? DEFAULT_STYLE;
}

export function LearningTracks({
  tracks = [],
  loading,
}: {
  tracks?: StudentTrack[];
  loading?: boolean;
}) {
  // A track with nothing published in it is not worth sending a student to.
  const visible = tracks.filter((track) => track.courseCount > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[1.25rem] bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Explore tracks</h3>
        <Link
          href="/dashboard/courses?tab=all-courses"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((track) => {
          const { icon: Icon, className } = styleFor(track.name);
          return (
            <Link
              key={track.id}
              href={`/dashboard/courses?tab=all-courses&category=${encodeURIComponent(track.name)}`}
              className="group relative overflow-hidden rounded-[1.25rem] border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition duration-300 group-hover:scale-110 ${className}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 line-clamp-1 font-display text-sm font-bold text-foreground transition duration-200 group-hover:text-primary">
                {track.name}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {track.courseCount} {track.courseCount === 1 ? "course" : "courses"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
