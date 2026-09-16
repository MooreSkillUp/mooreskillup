/**
 * Predefined avatar catalogue (no custom uploads, by design).
 * Pure data — no React — so both server and client components can import it.
 * Each entry renders as a flat coloured circle with an emoji; the chosen `id`
 * is stored on the user (avatarUrl).
 */
export interface AvatarOption {
  id: string;
  label: string;
  emoji: string;
  /** A single flat colour. These were two-stop gradients. */
  color: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "av-blue", label: "Professional", emoji: "🧑‍💼", color: "bg-sky-600" },
  { id: "av-green", label: "Scholar", emoji: "🧑‍🎓", color: "bg-emerald-600" },
  { id: "av-purple", label: "Coder", emoji: "🧑‍💻", color: "bg-violet-600" },
  { id: "av-amber", label: "Creative", emoji: "🧑‍🎨", color: "bg-amber-600" },
  { id: "av-rose", label: "Mentor", emoji: "🧑‍🏫", color: "bg-rose-600" },
  { id: "av-cyan", label: "Builder", emoji: "👷", color: "bg-cyan-600" },
  { id: "av-lime", label: "Explorer", emoji: "🧭", color: "bg-lime-600" },
  { id: "av-indigo", label: "Strategist", emoji: "♟️", color: "bg-indigo-600" },
  { id: "av-orange", label: "Innovator", emoji: "💡", color: "bg-orange-600" },
  { id: "av-teal", label: "Analyst", emoji: "📊", color: "bg-teal-600" },
  { id: "av-pink", label: "Designer", emoji: "🎨", color: "bg-pink-600" },
  { id: "av-slate", label: "Classic", emoji: "🙂", color: "bg-slate-600" },
];

export function getAvatarById(id?: string | null) {
  return AVATARS.find((a) => a.id === id) ?? null;
}

// Fixed, unique avatars for admin tiers (not pickable, not in the student set).
// Keyed by adminRole (kebab-case, as on the user object).
export const ADMIN_ROLE_AVATARS: Record<string, AvatarOption> = {
  "super-admin": { id: "role-super-admin", label: "Super Admin", emoji: "👑", color: "bg-amber-500" },
  admin: { id: "role-admin", label: "Admin", emoji: "🛡️", color: "bg-blue-600" },
  moderator: { id: "role-moderator", label: "Moderator", emoji: "⚖️", color: "bg-slate-600" },
};

/** Admins get a fixed role avatar; everyone else uses their picked one. */
export function getRoleAvatar(role?: string | null, adminRole?: string | null): AvatarOption | null {
  if (role === "admin") {
    return ADMIN_ROLE_AVATARS[adminRole ?? "super-admin"] ?? ADMIN_ROLE_AVATARS.admin;
  }
  return null;
}
