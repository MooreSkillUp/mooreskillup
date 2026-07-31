"use client";

import { Code, Terminal, Sparkles, Cloud, Smartphone } from "lucide-react";

interface Track {
  name: string;
  coursesCount: number;
  icon: typeof Code;
  colorClass: string;
}

export function LearningTracks() {
  const tracks: Track[] = [
    {
      name: "Web Development",
      coursesCount: 12,
      icon: Code,
      colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    },
    {
      name: "Programming Languages",
      coursesCount: 10,
      icon: Terminal,
      colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    },
    {
      name: "AI & Machine Learning",
      coursesCount: 8,
      icon: Sparkles,
      colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    },
    {
      name: "Cloud & DevOps",
      coursesCount: 7,
      icon: Cloud,
      colorClass: "text-sky-500 bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20",
    },
    {
      name: "Mobile Development",
      coursesCount: 6,
      icon: Smartphone,
      colorClass: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Explore Core Browsers (Tracks)</h3>
        <span className="text-xs font-semibold text-primary cursor-pointer hover:underline">View all</span>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {tracks.map((track, i) => {
          const Icon = track.icon;
          return (
            <div
              key={i}
              className="group relative cursor-pointer overflow-hidden rounded-[1.25rem] border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${track.colorClass} transition duration-300 group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition duration-200">
                {track.name}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">{track.coursesCount} Courses</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
