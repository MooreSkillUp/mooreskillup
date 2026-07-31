const SESSION_COOKIE = "mooreskillup.session";
const ROLE_COOKIE = "mooreskillup.role";

const DAY = 60 * 60 * 24;

/**
 * How long the middleware-facing mirror cookie lives, per role.
 *
 * These deliberately match the backend's REFRESH_LIFETIMES. If the mirror
 * outlives the real session, middleware waves the user through to a protected
 * page and the first API call bounces them back to login — which reads as a
 * random logout. Keep the two in step.
 */
const MIRROR_MAX_AGE: Record<string, number> = {
  student: 90 * DAY,
  teacher: 14 * DAY,
  admin: 7 * DAY,
};

export function writeAuthCookies(role: string) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // The API sets its own auth cookies cross-site with SameSite=None. These two
  // are written by the browser app purely for its own middleware, so they are
  // same-site and keep the stricter Lax.
  const maxAge = MIRROR_MAX_AGE[role] ?? MIRROR_MAX_AGE.student;

  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}
