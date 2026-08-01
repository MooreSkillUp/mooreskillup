"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { width: 132, height: 38, tagline: "text-[9px] tracking-[0.16em]" },
  md: { width: 160, height: 46, tagline: "text-[10px] tracking-[0.18em]" },
  lg: { width: 200, height: 58, tagline: "text-xs tracking-[0.2em]" },
} as const;

export const BRAND_TAGLINE = "Learn • Build • Grow";

/**
 * The MooreSkillUp wordmark — the one place the logo is drawn.
 *
 * The tagline used to live only here, while the front door and the auth screens
 * rendered the bare SVG themselves. Same brand, two different appearances
 * depending on the page. Those screens now use this component, so there is one
 * answer to what the logo looks like, tagline included.
 *
 * Pass `href={null}` where the mark is decorative and shouldn't navigate, and
 * `tagline={false}` only where vertical space genuinely won't take it.
 */
export function BrandLogo({
  href = "/",
  size = "md",
  tagline = true,
  align = "start",
  priority = false,
  className,
}: {
  href?: string | null;
  size?: keyof typeof SIZES;
  tagline?: boolean;
  align?: "start" | "center";
  priority?: boolean;
  className?: string;
}) {
  const { width, height, tagline: taglineClass } = SIZES[size];

  const mark = (
    <>
      <Image
        src="/msu-logo.svg"
        alt="MooreSkillUp"
        width={width}
        height={height}
        priority={priority}
        className="block h-auto w-auto dark:hidden"
        style={{ maxHeight: height }}
      />
      <Image
        src="/msu-logo-white.svg"
        alt="MooreSkillUp"
        width={width}
        height={height}
        priority={priority}
        className="hidden h-auto w-auto dark:block"
        style={{ maxHeight: height }}
      />
      {tagline && (
        <span
          className={cn(
            "mt-1 font-medium uppercase text-muted-foreground",
            taglineClass,
            align === "center" && "text-center",
          )}
        >
          {BRAND_TAGLINE}
        </span>
      )}
    </>
  );

  const layout = cn(
    "inline-flex flex-col",
    align === "center" ? "items-center" : "items-start",
    className,
  );

  if (!href) {
    return <span className={layout}>{mark}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="MooreSkillUp home"
      className={cn(layout, "transition-opacity hover:opacity-80")}
    >
      {mark}
    </Link>
  );
}
