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

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"

# Allow static files to be served
WHITENOISE_AUTOREFRESH = False
WHITENOISE_USE_FINDERS = False
