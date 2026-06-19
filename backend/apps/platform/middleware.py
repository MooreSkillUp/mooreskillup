"""Maintenance mode: when enabled, only admins can use the API.

JWT authentication happens at the DRF view layer, so this middleware decodes the
token itself to decide whether the caller is an admin. Login/refresh/me and the
health/status endpoints stay open so admins can get in to turn maintenance off.
"""

from django.http import JsonResponse

EXEMPT_PREFIXES = (
    "/admin/",  # Django admin
    "/api/auth/login/",
    "/api/auth/refresh/",
    "/api/auth/me/",
    "/api/auth/password-reset/",
    "/api/platform/status/",
    "/api/certificates/verify/",
    "/api/certificates/template/",
    "/api/payments/webhooks/",
    "/api/health/",
    "/static/",
    "/media/",
)


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if not path.startswith("/api/") or path.startswith(EXEMPT_PREFIXES):
            return self.get_response(request)

        from .models import PlatformSettings

        settings_row = PlatformSettings.get_solo()
        if not settings_row.maintenance_mode:
            return self.get_response(request)

        if self._is_admin(request):
            return self.get_response(request)

        return JsonResponse(
            {"detail": settings_row.maintenance_message or "The platform is under maintenance."},
            status=503,
        )

    @staticmethod
    def _is_admin(request):
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication

            result = JWTAuthentication().authenticate(request)
            if result is None:
                return False
            user, _ = result
            return bool(user and user.is_active and user.role == "admin")
        except Exception:
            return False
