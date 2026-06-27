from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import UserSession


class SessionJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        session_key = validated_token.get("sid")
        if not session_key:
            raise AuthenticationFailed("Session missing.", code="session_missing")

        session = (
            UserSession.objects.select_related("user")
            .filter(session_key=session_key, user=user, is_active=True)
            .first()
        )
        if not session:
            raise AuthenticationFailed("Session has expired. Please sign in again.", code="session_expired")
        if not user.is_active or getattr(user, "is_locked", False):
            raise AuthenticationFailed("This account is unavailable.", code="account_locked")
        if session.expires_at <= timezone.now():
            session.is_active = False
            session.save(update_fields=["is_active", "updated_at"])
            raise AuthenticationFailed("Session has expired. Please sign in again.", code="session_expired")

        session.last_active = timezone.now()
        session.save(update_fields=["last_active", "updated_at"])
        return user, validated_token
