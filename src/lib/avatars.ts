/**
 * Predefined avatar catalogue (no custom uploads, by design).
 * Pure data — no React — so both server and client components can import it.
 * Each entry renders as a gradient circle with an emoji; the chosen `id` is
 * stored on the user (avatarUrl).
 */
export interface AvatarOption {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "av-blue", label: "Professional", emoji: "🧑‍💼", gradient: "from-sky-500 to-indigo-600" },
  { id: "av-green", label: "Scholar", emoji: "🧑‍🎓", gradient: "from-emerald-500 to-teal-600" },
  { id: "av-purple", label: "Coder", emoji: "🧑‍💻", gradient: "from-violet-500 to-fuchsia-600" },
  { id: "av-amber", label: "Creative", emoji: "🧑‍🎨", gradient: "from-amber-500 to-orange-600" },
  { id: "av-rose", label: "Mentor", emoji: "🧑‍🏫", gradient: "from-rose-500 to-pink-600" },
  { id: "av-cyan", label: "Builder", emoji: "👷", gradient: "from-cyan-500 to-blue-600" },
  { id: "av-lime", label: "Explorer", emoji: "🧭", gradient: "from-lime-500 to-green-600" },
  { id: "av-indigo", label: "Strategist", emoji: "♟️", gradient: "from-indigo-500 to-purple-600" },
  { id: "av-orange", label: "Innovator", emoji: "💡", gradient: "from-orange-500 to-red-600" },
  { id: "av-teal", label: "Analyst", emoji: "📊", gradient: "from-teal-500 to-emerald-600" },
  { id: "av-pink", label: "Designer", emoji: "🎨", gradient: "from-pink-500 to-rose-600" },
  { id: "av-slate", label: "Classic", emoji: "🙂", gradient: "from-slate-500 to-slate-700" },
];

export function getAvatarById(id?: string | null) {
  return AVATARS.find((a) => a.id === id) ?? null;
}

// Fixed, unique avatars for admin tiers (not pickable, not in the student set).
// Keyed by adminRole (kebab-case, as on the user object).
export const ADMIN_ROLE_AVATARS: Record<string, AvatarOption> = {
  "super-admin": { id: "role-super-admin", label: "Super Admin", emoji: "👑", gradient: "from-amber-400 to-yellow-600" },
  admin: { id: "role-admin", label: "Admin", emoji: "🛡️", gradient: "from-blue-500 to-indigo-700" },
  moderator: { id: "role-moderator", label: "Moderator", emoji: "⚖️", gradient: "from-slate-500 to-slate-700" },
};

/** Admins get a fixed role avatar; everyone else uses their picked one. */
export function getRoleAvatar(role?: string | null, adminRole?: string | null): AvatarOption | null {
  if (role === "admin") {
    return ADMIN_ROLE_AVATARS[adminRole ?? "super-admin"] ?? ADMIN_ROLE_AVATARS.admin;
  }
  return null;
}
