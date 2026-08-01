import { Award, BookOpen, Clock3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerVariant = "cloud" | "python" | "design" | "ai" | "cyber" | "engineering" | "default";

function resolveVariant(label: string): BannerVariant {
  const value = label.toLowerCase();
  if (value.includes("cloud") || value.includes("devops") || value.includes("azure")) return "cloud";
  if (value.includes("python")) return "python";
  if (value.includes("ux") || value.includes("ui") || value.includes("design")) return "design";
  if (value.includes("ai") || value.includes("machine") || value.includes("ml")) return "ai";
  if (value.includes("cyber") || value.includes("security")) return "cyber";
  if (value.includes("engineer") || value.includes("engineering")) return "engineering";
  return "default";
}

const VARIANT_CLASSNAMES: Record<BannerVariant, { shell: string; glow: string; badge: string }> = {
  cloud: {
    shell: "from-sky-700 via-blue-600 to-slate-950",
    glow: "bg-sky-400/25",
    badge: "bg-white/15 text-white",
  },
  python: {
    shell: "from-emerald-700 via-green-600 to-slate-950",
    glow: "bg-emerald-400/25",
    badge: "bg-white/15 text-white",
  },
  design: {
    shell: "from-violet-700 via-fuchsia-600 to-slate-950",
    glow: "bg-fuchsia-400/25",
    badge: "bg-white/15 text-white",
  },
  ai: {
    shell: "from-rose-700 via-orange-600 to-slate-950",
    glow: "bg-rose-400/25",
    badge: "bg-white/15 text-white",
  },
  cyber: {
    shell: "from-red-700 via-rose-600 to-slate-950",
    glow: "bg-red-400/25",
    badge: "bg-white/15 text-white",
  },
  engineering: {
    shell: "from-slate-700 via-blue-800 to-slate-950",
    glow: "bg-blue-400/25",
    badge: "bg-white/15 text-white",
  },
  default: {
    shell: "from-slate-700 via-slate-600 to-slate-950",
    glow: "bg-slate-400/20",
    badge: "bg-white/15 text-white",
  },
};

export function CourseBanner({
  title,
  subtitle,
  category,
  track,
  level,
  durationLabel,
  priceLabel,
  certificateEnabled,
  compact = false,
  dense = false,
  bannerImage,
  bannerTheme,
  categoryAccentColor,
  className,
}: {
  title: string;
  subtitle?: string;
  category?: string;
  track?: string;
  level?: string;
  durationLabel?: string;
  priceLabel?: string;
  certificateEnabled?: boolean;
  compact?: boolean;
  /** Artwork only: category and title. For places that already show the
   *  course details beside the banner, so it isn't said twice. */
  dense?: boolean;
  bannerImage?: string | null;
  bannerTheme?: string;
  categoryAccentColor?: string;
  className?: string;
}) {
  const variant = resolveVariant(category ?? "");
  const classes = VARIANT_CLASSNAMES[variant];
  const resolvedTheme = bannerTheme && bannerTheme !== "default" ? bannerTheme : variant;
  const themeClasses = VARIANT_CLASSNAMES[resolvedTheme as BannerVariant] ?? classes;

  // Outer container background:
  // - If there is a banner image: show the raw image (no color tint), outer bg is transparent
  // - If there is a category accent color: use it as the gradient background
  // - Otherwise: fall back to the Tailwind theme class gradient
  const outerBgStyle: React.CSSProperties | undefined = bannerImage
    ? undefined  // image itself covers the background
    : categoryAccentColor
      ? { background: `linear-gradient(135deg, ${categoryAccentColor} 0%, ${categoryAccentColor}bb 100%)`, }
      : undefined;

  // Dark overlay for readability on top of a banner image only
  const imageOverlayStyle: React.CSSProperties | undefined = bannerImage
    ? { background: "linear-gradient(to top, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.35) 55%, transparent 100%)" }
    : undefined;

  const dynamicGlowStyle = categoryAccentColor && !bannerImage
    ? { backgroundColor: "#ffffff", opacity: 0.12 }
    : undefined;

  const dynamicBadgeStyle = categoryAccentColor
    ? {
        backgroundColor: `${categoryAccentColor}33`,
        color: "#ffffff",
        border: `1px solid ${categoryAccentColor}66`,
      }
    : undefined;

  // Use Tailwind theme gradient only when no image and no dynamic accent color
  const useSolidThemeGradient = !bannerImage && !categoryAccentColor;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-white/10 text-white shadow-sm",
        useSolidThemeGradient && "bg-gradient-to-br",
        useSolidThemeGradient && themeClasses.shell,
        dense ? "min-h-[130px] p-4" : compact ? "min-h-[180px] p-4" : "min-h-[220px] p-5",
        className,
      )}
      style={outerBgStyle}
    >
      {bannerImage ? (
        <img src={bannerImage} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {/* Dark gradient overlay — only for images so text stays legible */}
      {imageOverlayStyle && <div className="absolute inset-0" style={imageOverlayStyle} />}
      {/* Glow orb — only when using accent color without an image */}
      <div
        className={cn("absolute right-[-18px] top-[-24px] h-28 w-28 rounded-full blur-3xl", useSolidThemeGradient && themeClasses.glow)}
        style={dynamicGlowStyle}
      />
      <div className="absolute bottom-[-28px] left-[-10px] h-24 w-24 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span
            className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", !categoryAccentColor && classes.badge)}
            style={dynamicBadgeStyle}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{category || "MooreSkillUp"}</span>
          </span>
          {certificateEnabled && !dense ? (
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 sm:inline-flex">
              <Award className="h-3.5 w-3.5" /> Certificate
            </span>
          ) : null}
        </div>

        <div className="mt-auto space-y-2">
          {track && !dense ? <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/75">{track}</p> : null}
          <h3 className={cn("font-display font-semibold leading-tight line-clamp-2", dense || compact ? "text-lg" : "text-2xl")}>{title}</h3>
          {subtitle && !dense ? <p className="max-w-xl text-sm text-white/80 line-clamp-2">{subtitle}</p> : null}
          {!dense && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
            {level ? <span className="rounded-full bg-white/15 px-2.5 py-1">{level}</span> : null}
            {durationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                <Clock3 className="h-3.5 w-3.5" /> {durationLabel}
              </span>
            ) : null}
            {priceLabel ? <span className="rounded-full bg-white/15 px-2.5 py-1">{priceLabel}</span> : null}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CourseBannerHighlight({
  title,
  caption,
  icon: Icon = Sparkles,
}: {
  title: string;
  caption: string;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">{caption}</div>
        </div>
      </div>
    </div>
  );
}
