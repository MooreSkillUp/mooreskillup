"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { width: 132, height: 38 },
  md: { width: 160, height: 46 },
  lg: { width: 200, height: 58 },
} as const;

/**
 * The MooreSkillUp wordmark — the one place the logo is drawn.
 *
 * The mark used to carry a "Learn • Build • Grow" tagline underneath, but the
 * front door and the auth screens rendered the bare SVG themselves, so the same
 * brand appeared two different ways depending on the page. The tagline is gone
 * and those screens now use this component, so there is a single answer to what
 * the logo looks like.
 *
 * Pass `href={null}` where the mark is decorative and shouldn't navigate.
 */
export function BrandLogo({
  href = "/",
  size = "md",
  priority = false,
  className,
}: {
  href?: string | null;
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}) {
  const { width, height } = SIZES[size];

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
    </>
  );

  if (!href) {
    return <span className={cn("inline-flex items-center", className)}>{mark}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="MooreSkillUp home"
      className={cn("inline-flex items-center transition-opacity hover:opacity-80", className)}
    >
      {mark}
    </Link>
  );
}
