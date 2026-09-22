/**
 * What we tell Sentry, and what we keep from it.
 *
 * The app knows who is signed in, what they paid and what their email is. None
 * of that belongs in a crash report: we send the error and where it happened,
 * never the person it happened to. `sendDefaultPii: false` is the setting that
 * decides it, and `scrub` is the second pair of hands.
 *
 * Nothing is sent unless NEXT_PUBLIC_SENTRY_DSN is set, so a laptop reports
 * nowhere.
 */
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/** Query strings carry certificate codes and referral codes. */
function stripQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  const cut = url.indexOf("?");
  return cut === -1 ? url : url.slice(0, cut);
}

export function scrub(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    event.request.url = stripQuery(event.request.url);
    const headers = event.request.headers;
    if (headers) {
      for (const name of Object.keys(headers)) {
        if (/password|token|authorization|cookie|secret|key|otp/i.test(name)) delete headers[name];
      }
    }
  }
  return event;
}

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
  // Never attach the signed-in person, their cookies or what they typed.
  sendDefaultPii: false,
  // Error reporting only. Tracing would spend the free allowance on questions
  // we are not asking yet.
  tracesSampleRate: 0,
  maxBreadcrumbs: 25,
  beforeSend: scrub,
  // A browser extension throwing inside someone else's code is not our bug,
  // and a cancelled request is not a failure.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "AbortError",
    "NetworkError when attempting to fetch resource",
    "Failed to fetch",
  ],
};
