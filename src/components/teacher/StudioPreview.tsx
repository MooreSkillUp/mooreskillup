"use client";

import { useState } from "react";
import { Award, Clock, Eye, Monitor, Smartphone, Star, Users } from "lucide-react";

import { CourseBanner } from "@/components/course/CourseBanner";
import { formatNaira } from "@/lib/commerce";
import { cn } from "@/lib/utils";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * What the course looks like to a student, while it is being written.
 *
 * The studio otherwise gives a teacher no idea how any of it lands — they fill
 * in a title, a price and a banner and find out what it looks like only after
 * publishing. This renders the real card component with the draft's own values,
 * so what they see here is what a student gets, not an approximation drawn a
 * second time.
 *
 * Phone and desktop because the two crop differently: a subtitle that fits on a
 * laptop is two lines on a phone, and that is worth finding out before students
 * do.
 */
export function StudioPreview({
  title,
  subtitle,
  program,
  track,
  level,
  price,
  discountPrice,
  lessonCount,
  durationMinutes,
  certificateEnabled,
  bannerImage,
  bannerTheme,
  categoryAccentColor,
}: {
  title: string;
  subtitle: string;
  program: string;
  track: string;
  level: string;
  price: number;
  discountPrice?: number | null;
  lessonCount: number;
  durationMinutes: number;
  certificateEnabled: boolean;
  bannerImage?: string | null;
  bannerTheme?: string;
  categoryAccentColor?: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const isFree = price === 0;
  const discounted = discountPrice !== null && discountPrice !== undefined && discountPrice < price;
  const priceLabel = isFree
    ? "Free"
    : formatNaira(discounted ? (discountPrice as number) : price);

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const lengthLabel = durationMinutes
    ? hours
      ? `${hours}h${minutes ? ` ${minutes}m` : ""}`
      : `${minutes}m`
    : "";

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold">Student preview</h3>
        </div>

        <div className="flex rounded-lg border border-border p-0.5">
          {(
            [
              { id: "desktop" as const, icon: Monitor, label: "Desktop" },
              { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
            ]
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-pressed={device === id}
              aria-label={label}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                device === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Constrained rather than scaled: a real card at phone width shows
            real wrapping, where a shrunk desktop card hides it. */}
        <div className={cn("mx-auto transition-[max-width]", device === "mobile" ? "max-w-[19rem]" : "max-w-full")}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <CourseBanner
              title={title || "Untitled course"}
              category={program}
              certificateEnabled={certificateEnabled}
              dense
              bannerImage={bannerImage ?? undefined}
              bannerTheme={bannerTheme ?? "default"}
              categoryAccentColor={categoryAccentColor}
              className="rounded-none"
            />

            <div className="space-y-2.5 p-4">
              <div>
                <p className="line-clamp-2 font-medium leading-snug">
                  {title || "Untitled course"}
                </p>
                {subtitle && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {/* A new course has no rating and no students. Showing invented
                    ones here would teach a teacher to expect them. */}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  New
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />0
                </span>
                {lessonCount > 0 && (
                  <span>
                    {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                  </span>
                )}
                {lengthLabel && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {lengthLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="font-display text-lg font-bold">
                  {priceLabel}
                  {discounted && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">
                      {formatNaira(price)}
                    </span>
                  )}
                </span>
                <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                  View course
                </span>
              </div>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">Level</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">
              {LEVEL_LABEL[level] ?? level ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-border px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">Track</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">{track || "Not set"}</dd>
          </div>
        </dl>

        {certificateEnabled && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-xs text-success">
            <Award className="h-3.5 w-3.5 shrink-0" />
            Students who finish this course earn a certificate.
          </p>
        )}
      </div>
    </section>
  );
}
