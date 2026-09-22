"""Error reporting, with the students left out of it.

Sentry is told when something breaks and where in the code it broke. It is never
told who it happened to: no names, no email addresses, no cookies, no session
tokens, no card details. That is a deliberate setting, not a default — Sentry
will happily attach the signed-in user and the request body when asked to.

Nothing is sent unless SENTRY_DSN is set, so local development and tests report
nowhere.
"""

import os

# Query strings carry a certificate's verification code and a referral code; the
# path alone is enough to find the fault.
_SCRUB_KEYS = ("password", "token", "authorization", "cookie", "secret", "key", "otp")


def scrub(event, _hint):
    """Last line of defence: drop anything personal the SDK still attached."""
    event.pop("user", None)
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("cookies", None)
        request.pop("data", None)
        request.pop("query_string", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            for name in list(headers):
                if any(word in name.lower() for word in _SCRUB_KEYS):
                    headers.pop(name)
    return event


def sentry_options(dsn, environment, release=""):
    """The options we initialise with, kept separate so they can be tested."""
    return {
        "dsn": dsn,
        "environment": environment,
        "release": release or None,
        # The one that matters: never attach the signed-in user or the request
        # body to an error report.
        "send_default_pii": False,
        # Error reporting only. Performance tracing would spend the free
        # allowance on questions we are not asking yet.
        "traces_sample_rate": 0.0,
        "before_send": scrub,
        "max_breadcrumbs": 25,
    }


def init_sentry(environment):
    """Start error reporting when a DSN is configured. Safe to call always."""
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    import sentry_sdk

    sentry_sdk.init(**sentry_options(dsn, environment, os.getenv("IMAGE_TAG", "")))
    return True
