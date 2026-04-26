"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  size = "md",
  subtitle = "Learning Academy",
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
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20",
          iconSize,
        )}
      >
        {publicEnv.brandLogoSrc ? (
          <Image
            src={publicEnv.brandLogoSrc}
            alt="MooreSkillUp logo"
            fill
            className="object-contain p-2"
            sizes="44px"
          />
        ) : (
          <GraduationCap className={compact ? "h-5 w-5" : "h-5 w-5"} />
        )}
      </div>
      <div>
        <div className={cn("font-display font-bold tracking-tight", textSize)}>
          MooreSkillUp
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}
