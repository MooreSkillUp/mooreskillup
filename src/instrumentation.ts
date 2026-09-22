// Errors in the parts of the app that run on a server: pages rendered for a
// visitor, and the small edge runtime. Next calls register() once at startup.
import * as Sentry from "@sentry/nextjs";

import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

export async function register() {
  if (SENTRY_DSN) Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
