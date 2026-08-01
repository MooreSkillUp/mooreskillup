/**
 * Which navigation item should be highlighted for the current path.
 *
 * The sidebar used to test each item independently with a prefix match, so
 * `/dashboard/courses` lit up **both** "Dashboard" and "Courses" — the parent's
 * prefix matched its own child. Two active items make the nav read as broken.
 *
 * Instead: every item that could match competes, and the most specific one wins.
 * Exactly one item is ever active.
 */

/**
 * Routes that belong to a nav section but don't sit under its href.
 *
 * A student reading `/lesson/abc` is in the Courses part of the app even though
 * the URL says nothing about courses.
 */
const SECTION_ALIASES: Record<string, string[]> = {
  "/dashboard/courses": ["/course", "/lesson"],
  "/dashboard/payments": ["/payment"],
  "/teacher/courses": ["/teacher/course"],
};

function matchStrength(pathname: string, href: string): number {
  // Length is the specificity score: "/dashboard/courses" beats "/dashboard".
  if (pathname === href || pathname.startsWith(`${href}/`)) return href.length;

  for (const alias of SECTION_ALIASES[href] ?? []) {
    if (pathname === alias || pathname.startsWith(`${alias}/`)) return href.length;
  }

  return -1;
}

/** The single href to highlight, or null when the path is outside the nav. */
export function activeNavHref(pathname: string | null, hrefs: string[]): string | null {
  if (!pathname) return null;

  let best: string | null = null;
  let bestStrength = -1;

  for (const href of hrefs) {
    const strength = matchStrength(pathname, href);
    if (strength > bestStrength) {
      bestStrength = strength;
      best = href;
    }
  }

  return best;
}
