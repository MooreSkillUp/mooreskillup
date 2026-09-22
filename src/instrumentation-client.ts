// Errors in the browser. Sentry reads this file on the client at startup.
import * as Sentry from "@sentry/nextjs";

import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

if (SENTRY_DSN) Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
