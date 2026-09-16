import { BookOpen, Sparkles } from "lucide-react";
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

/** One flat colour per subject. A gradient reads as decoration; a plain block
 *  reads as a label, and it's what a photograph will replace. */
const VARIANT_COLOR: Record<BannerVariant, string> = {
  cloud: "bg-sky-700",
  python: "bg-emerald-700",
  design: "bg-violet-700",
  ai: "bg-orange-700",
  cyber: "bg-red-700",
  engineering: "bg-slate-700",
  default: "bg-slate-600",
};

/**
 * The artwork at the top of a course card, and nothing else.
 *
 * It used to print the title over the colour — which every caller then printed
 * again directly underneath, so each card said the course name twice. It also
 * carried the subtitle, track, level, duration and price, all repeated by the
 * card body, and a dark scrim to keep that text readable over a photo.
 *
 * With the text gone the scrim goes too, so an uploaded banner is seen as the
 * teacher uploaded it. `title` stays as the image's alt text.
 */
export function CourseBanner({
  title,
  category,
  bannerImage,
  bannerTheme,
  categoryAccentColor,
  className,
}: {
  /** Not drawn — describes the artwork for screen readers. */
  title: string;
  category?: string;
  bannerImage?: string | null;
  bannerTheme?: string;
  categoryAccentColor?: string;
  className?: string;
}) {
  const variant = resolveVariant(category ?? "");
  const theme = (bannerTheme && bannerTheme !== "default" ? bannerTheme : variant) as BannerVariant;
  const themeColor = VARIANT_COLOR[theme] ?? VARIANT_COLOR[variant];

  return (
    <div
      className={cn(
        "relative flex min-h-[130px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 text-white shadow-sm",
        !bannerImage && !categoryAccentColor && themeColor,
        "p-4",
        className,
      )}
      style={!bannerImage && categoryAccentColor ? { backgroundColor: categoryAccentColor } : undefined}
    >
      {bannerImage ? (
        <img src={bannerImage} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      {/* The chip carries its own dark backing, so it stays readable over a
          photograph without dimming the whole image. */}
      <span
        className={cn(
          "relative inline-flex min-w-0 max-w-full items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
          bannerImage ? "bg-black/60 text-white" : "bg-white/15 text-white",
        )}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{category || "MooreSkillUp"}</span>
      </span>
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
