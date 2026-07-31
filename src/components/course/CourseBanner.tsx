import { Award, BookOpen, Bookmark, Clock3, Sparkles } from "lucide-react";
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

function BannerGraphic({ category, certificateEnabled }: { category?: string; certificateEnabled?: boolean }) {
  const isCode = category?.toLowerCase().includes("web") || 
                 category?.toLowerCase().includes("python") || 
                 category?.toLowerCase().includes("program") || 
                 category?.toLowerCase().includes("engineer") || 
                 category?.toLowerCase().includes("code") ||
                 category?.toLowerCase().includes("devops");
  
  if (certificateEnabled) {
    return (
      <svg className="absolute right-2 bottom-2 md:right-4 md:bottom-4 h-20 w-20 text-white opacity-20 pointer-events-none md:block hidden" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="15" y="15" width="70" height="55" rx="5" />
        <rect x="20" y="20" width="60" height="45" rx="3" strokeWidth="1.5" />
        <line x1="30" y1="32" x2="70" y2="32" strokeWidth="2" />
        <line x1="30" y1="42" x2="60" y2="42" />
        <line x1="30" y1="52" x2="50" y2="52" />
        <circle cx="70" cy="52" r="8" fill="currentColor" className="text-white/40" stroke="currentColor" strokeWidth="2" />
        <path d="M66 58l-2 8 6-3 6 3-2-8" strokeWidth="2" />
      </svg>
    );
  }

  if (isCode) {
    return (
      <svg className="absolute right-2 bottom-2 md:right-4 md:bottom-4 h-20 w-20 text-white opacity-20 pointer-events-none md:block hidden" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="15" width="80" height="60" rx="6" />
        <line x1="10" y1="30" x2="90" y2="30" />
        <circle cx="18" cy="22" r="1.5" fill="currentColor" />
        <circle cx="24" cy="22" r="1.5" fill="currentColor" />
        <circle cx="30" cy="22" r="1.5" fill="currentColor" />
        <path d="M38 42l-8 8 8 8M62 42l8 8-8 8M53 40l-6 20" strokeWidth="3" />
      </svg>
    );
  }

  return null;
}

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
  bannerImage,
  bannerTheme,
  categoryAccentColor,
  className,
  isBookmarked,
  onBookmarkToggle,
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
  bannerImage?: string | null;
  bannerTheme?: string;
  categoryAccentColor?: string;
  className?: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
}) {
  const variant = resolveVariant(category ?? "");
  const classes = VARIANT_CLASSNAMES[variant];
  const resolvedTheme = bannerTheme && bannerTheme !== "default" ? bannerTheme : variant;
  const themeClasses = VARIANT_CLASSNAMES[resolvedTheme as BannerVariant] ?? classes;

  const outerBgStyle: React.CSSProperties | undefined = bannerImage
    ? undefined
    : categoryAccentColor
      ? { background: `linear-gradient(135deg, ${categoryAccentColor} 0%, ${categoryAccentColor}bb 100%)`, }
      : undefined;

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

  const useSolidThemeGradient = !bannerImage && !categoryAccentColor;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-white/10 text-white shadow-sm",
        useSolidThemeGradient && "bg-gradient-to-br",
        useSolidThemeGradient && themeClasses.shell,
        compact ? "min-h-[180px] p-4" : "min-h-[220px] p-5",
        className,
      )}
      style={outerBgStyle}
    >
      {bannerImage ? (
        <img src={bannerImage} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {imageOverlayStyle && <div className="absolute inset-0" style={imageOverlayStyle} />}
      <div
        className={cn("absolute right-[-18px] top-[-24px] h-28 w-28 rounded-full blur-3xl", useSolidThemeGradient && themeClasses.glow)}
        style={dynamicGlowStyle}
      />
      <div className="absolute bottom-[-28px] left-[-10px] h-24 w-24 rounded-full bg-white/10 blur-3xl" />
      
      {/* Dynamic Graphic */}
      <BannerGraphic category={category || track} certificateEnabled={certificateEnabled} />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", !categoryAccentColor && classes.badge)}
            style={dynamicBadgeStyle}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {category || "MooreSkillUp"}
          </span>
          <div className="flex items-center gap-2">
            {certificateEnabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                <Award className="h-3.5 w-3.5" /> Certificate
              </span>
            ) : null}
            {onBookmarkToggle ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBookmarkToggle();
                }}
                className="rounded-full border border-white/20 bg-white/15 p-2 text-white hover:bg-white/30 transition shadow-sm"
                aria-label="Bookmark course"
              >
                <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current text-white")} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-2 pr-12 md:pr-16">
          {track ? <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/75">{track}</p> : null}
          <h3 className={cn("font-display font-semibold leading-tight", compact ? "text-lg" : "text-2xl")}>{title}</h3>
          {subtitle ? <p className="max-w-xl text-sm text-white/80 line-clamp-2">{subtitle}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
            {level ? <span className="rounded-full bg-white/15 px-2.5 py-1">{level}</span> : null}
            {durationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                <Clock3 className="h-3.5 w-3.5" /> {durationLabel}
              </span>
            ) : null}
            {priceLabel ? <span className="rounded-full bg-white/15 px-2.5 py-1">{priceLabel}</span> : null}
          </div>
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
