import { getAvatarById, getRoleAvatar } from "@/lib/avatars";

/**
 * Renders a user's avatar. Admins get a fixed role avatar (crown/shield/scales);
 * teachers & students pick from the predefined set (stored as "av-*" in
 * avatarUrl). Falls back to initials when nothing is chosen.
 */
export function UserAvatar({
  avatarId,
  initials,
  role,
  adminRole,
  size = 36,
  className = "",
}: {
  avatarId?: string | null;
  initials?: string;
  role?: string | null;
  adminRole?: string | null;
  size?: number;
  className?: string;
}) {
  const avatar = getRoleAvatar(role, adminRole) ?? getAvatarById(avatarId);
  const dimension = { width: size, height: size, fontSize: size * 0.45 };

  if (avatar) {
    return (
      <div
        style={dimension}
        className={`flex items-center justify-center rounded-full bg-gradient-to-br ${avatar.gradient} ${className}`}
        aria-label={avatar.label}
      >
        <span style={{ fontSize: size * 0.5 }}>{avatar.emoji}</span>
      </div>
    );
  }

  return (
    <div
      style={dimension}
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground ${className}`}
    >
      {initials}
    </div>
  );
}
