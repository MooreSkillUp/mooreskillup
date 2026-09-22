"""One address an outside monitor can watch.

A monitor that only checks whether a page loads will happily report "up" while
the database is unreachable and every student sees an error. So this touches the
database before answering, and answers 503 when it cannot.

It says nothing about the platform beyond up or down: no versions, no counts, no
settings. Anyone on the internet can call it, so it carries nothing worth having.
"""

from django.db import connection
from rest_framework import permissions, response, status, views


class HealthView(views.APIView):
    """GET /api/health/ — 200 when the API and its database answer."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    # No throttle: a monitor calls this every few minutes by design, and a
    # throttled 429 would be read as an outage.
    throttle_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            return response.Response(
                {"status": "error", "database": False},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return response.Response({"status": "ok", "database": True})
