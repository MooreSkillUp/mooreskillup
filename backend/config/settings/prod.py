import os

from .base import *  # noqa: F403,F401

DEBUG = False

# Security
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# The frontend is served from a different domain than this API, so auth cookies
# must be SameSite=None or the browser silently drops them on the refresh call
# and every student gets signed out when their access token expires. Override
# with AUTH_COOKIE_SAMESITE=Lax if the two ever move under one root domain.
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "None")
SECURE_SSL_REDIRECT = False  # Railway handles HTTPS, don't redirect
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Static Files with WhiteNoise
MIDDLEWARE = [
    "whitenoise.middleware.WhiteNoiseMiddleware",
] + MIDDLEWARE

# Uploads go to Blob Storage, not the container's own disk.
#
# A container filesystem is thrown away on every deploy and every scale event,
# so a course banner uploaded on Monday was gone the moment the next revision
# started. With min_replicas=0 it would not even survive the app going idle.
# Blob Storage is the durable place uploads belong.
#
# Static files stay with WhiteNoise: they are baked into the image at build
# time, so they are already durable and serving them locally is faster than a
# round trip to blob storage.
AZURE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT", "")
AZURE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_KEY", "")
AZURE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "media")

if AZURE_ACCOUNT_NAME and AZURE_ACCOUNT_KEY:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.azure_storage.AzureStorage",
            "OPTIONS": {
                "account_name": AZURE_ACCOUNT_NAME,
                "account_key": AZURE_ACCOUNT_KEY,
                "azure_container": AZURE_CONTAINER,
                # Uploads keep their own name rather than being overwritten by
                # the next file of the same name.
                "overwrite_files": False,
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    MEDIA_URL = f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/"
else:
    # No blob credentials: fall back to local disk so the app still runs, but
    # say so loudly, because uploads will not survive a deploy.
    import warnings

    warnings.warn(
        "AZURE_STORAGE_ACCOUNT/KEY not set - uploads are being written to the "
        "container filesystem and will be lost on the next deploy.",
        stacklevel=2,
    )
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"

# Allow static files to be served
WHITENOISE_AUTOREFRESH = False
WHITENOISE_USE_FINDERS = False


# Send application logs to stdout so the platform can collect them.
#
# Django's default logging only writes to the console when DEBUG is True; with
# DEBUG off it routes errors to mail_admins instead. On a container platform
# that means a 500 leaves no trace anywhere — the request fails, the logs show
# nothing, and there is no way to find out why. Anything running in a container
# needs its logs on stdout.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        # Unhandled exceptions land here. Without it, 500s are silent.
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            # Query logging is deafening; opt in with LOG_SQL=DEBUG when needed.
            "level": os.getenv("LOG_SQL", "WARNING"),
            "propagate": False,
        },
    },
}
