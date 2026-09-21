/**
 * The API address as seen from the server, which is not the one the browser
 * uses.
 *
 * In Docker the browser reaches the API on localhost:8000 while the web
 * container has to call it as api:8000 — the same URL cannot serve both. Server
 * components and preview images run in the container, so they need this one;
 * anything running in the browser keeps using buildApiUrl.
 *
 * On Vercel there is no separate internal address, so API_URL is simply unset
 * and this falls through to the public one.
 */
const SERVER_API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function serverApiUrl(endpoint: string): string {
  return `${SERVER_API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}
