"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  size = "md",
  subtitle = "Learn • Build • Grow",
  className,
}: {
  href?: string;
  size?: "sm" | "md";
  subtitle?: string;
  className?: string;
}) {
  const compact = size === "sm";
  const iconSize = compact ? "h-10 w-10" : "h-11 w-11";
  const textSize = compact ? "text-base" : "text-lg";

  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <div>
          <Image
            src="/msu-logo.svg"
            alt="Logo"
            width={170}
            height={50}
            className="block dark:hidden"
          />
          <Image
            src="/msu-logo-white.svg"
            alt="Logo"
            width={170}
            height={50}
            className="hidden dark:block"
          />
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}
