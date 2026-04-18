import { Flame, Trophy, Star, Zap, Award, Target, Crown, Rocket } from "lucide-react";
import type { Badge } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const iconMap = {
  flame: Flame,
  trophy: Trophy,
  star: Star,
  zap: Zap,
  award: Award,
  target: Target,
  crown: Crown,
  rocket: Rocket,
};

export function BadgeIcon({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" | "lg" }) {
  const Icon = iconMap[badge.icon];
  const sizes = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  };
  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-9 w-9",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl transition-all",
        sizes[size],
        badge.earned
          ? "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-md shadow-accent/30"
          : "bg-muted text-muted-foreground/40 grayscale",
      )}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}
