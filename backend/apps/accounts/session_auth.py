import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.platform.models import AuthenticationSettings

from .models import UserSession
from .serializers import UserSerializer

AUTH_REFRESH_COOKIE = "mooreskillup.refresh"
AUTH_SESSION_COOKIE = "mooreskillup.session"
AUTH_ROLE_COOKIE = "mooreskillup.role"

ACCESS_LIFETIMES = {
    "student": timedelta(minutes=30),
    "teacher": timedelta(minutes=15),
    "admin": timedelta(minutes=10),
}

REFRESH_LIFETIMES = {
    "student": timedelta(days=30),
    "teacher": timedelta(days=14),
    "admin": timedelta(days=7),
}

def _cookie_secure(request=None):
    if getattr(settings, "SESSION_COOKIE_SECURE", False):
        return True
    return bool(request and request.is_secure())


def get_access_lifetime(user):
    return ACCESS_LIFETIMES.get(getattr(user, "role", "student"), timedelta(minutes=30))


def get_refresh_lifetime(user):
    return REFRESH_LIFETIMES.get(getattr(user, "role", "student"), timedelta(days=30))


def get_device_limit(user):
    settings_row = AuthenticationSettings.get_solo()
    if getattr(user, "role", "student") == "teacher":
        return settings_row.max_teacher_devices
    if getattr(user, "role", "student") == "admin":
        return settings_row.max_admin_devices
    return settings_row.max_student_devices


def prune_expired_sessions(user):
    now = timezone.now()
    UserSession.objects.filter(user=user, is_active=True, expires_at__lte=now).update(is_active=False)


def enforce_device_limit(user):
    prune_expired_sessions(user)
    limit = get_device_limit(user)
    active_sessions = list(UserSession.objects.filter(user=user, is_active=True).order_by("last_active", "created_at"))
    if len(active_sessions) < limit:
        return
    overflow = len(active_sessions) - limit + 1
    for session in active_sessions[:overflow]:
        session.is_active = False
        session.save(update_fields=["is_active", "updated_at"])


def create_user_session(user, request=None):
    enforce_device_limit(user)
    session_key = secrets.token_urlsafe(24)
    refresh = RefreshToken.for_user(user)
    refresh["sid"] = session_key
    refresh["role"] = user.role
    if getattr(user, "admin_role", None):
        refresh["adminRole"] = user.admin_role
    refresh_jti = str(refresh["jti"])
    session = UserSession.objects.create(
        user=user,
        session_key=session_key,
        refresh_jti=refresh_jti,
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:255],
        ip_address=request.META.get("REMOTE_ADDR") if request else None,
        expires_at=timezone.now() + get_refresh_lifetime(user),
    )
    refresh.set_exp(lifetime=get_refresh_lifetime(user))
    access = refresh.access_token
    access["sid"] = session_key
    access["role"] = user.role
    if getattr(user, "admin_role", None):
        access["adminRole"] = user.admin_role
    access.set_exp(lifetime=get_access_lifetime(user))
    return session, str(access), str(refresh)


def revoke_session(session: UserSession):
    session.is_active = False
    session.save(update_fields=["is_active", "updated_at"])


def revoke_all_sessions(user):
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)


def clear_failed_logins(user):
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=["failed_login_attempts", "locked_until"])


def register_failed_login(user, lock_after=5, lock_minutes=15):
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= lock_after:
        user.locked_until = timezone.now() + timedelta(minutes=lock_minutes)
        user.failed_login_attempts = 0
    user.save(update_fields=["failed_login_attempts", "locked_until"])


def set_auth_cookies(response: Response, refresh_token: str, session: UserSession, request=None):
    secure = _cookie_secure(request)
    refresh_age = int(get_refresh_lifetime(session.user).total_seconds())
    response.set_cookie(
        AUTH_REFRESH_COOKIE,
        refresh_token,
        max_age=refresh_age,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/api/auth/",
    )
    response.set_cookie(
        AUTH_SESSION_COOKIE,
        session.session_key,
        max_age=refresh_age,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/",
    )
    response.set_cookie(
        AUTH_ROLE_COOKIE,
        session.user.role,
        max_age=refresh_age,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/",
    )
    return response


def clear_auth_cookies(response: Response):
    for name, path in (
        (AUTH_REFRESH_COOKIE, "/api/auth/"),
        (AUTH_SESSION_COOKIE, "/"),
        (AUTH_ROLE_COOKIE, "/"),
    ):
        response.delete_cookie(name, path=path)
    return response


def build_session_auth_response(user, request=None):
    session, access, refresh = create_user_session(user, request=request)
    payload = {"access": access, "user": UserSerializer(user).data}
    response = Response(payload)
    return set_auth_cookies(response, refresh, session, request=request)


def refresh_session_from_token(refresh_token: str):
    old_refresh = RefreshToken(refresh_token)
    session_key = old_refresh.get("sid")
    if not session_key:
        raise TokenError("Session claim missing.")
    session = UserSession.objects.select_related("user").filter(session_key=session_key, is_active=True).first()
    if not session or session.is_expired():
        raise TokenError("Session expired.")
    if str(old_refresh["jti"]) != session.refresh_jti:
        raise TokenError("Refresh token has been rotated.")
    try:
        old_refresh.blacklist()
    except Exception:
        pass
    session.last_active = timezone.now()
    session.expires_at = timezone.now() + get_refresh_lifetime(session.user)
    new_refresh = RefreshToken.for_user(session.user)
    new_refresh["sid"] = session.session_key
    new_refresh["role"] = session.user.role
    if getattr(session.user, "admin_role", None):
        new_refresh["adminRole"] = session.user.admin_role
    new_refresh.set_exp(lifetime=get_refresh_lifetime(session.user))
    access = new_refresh.access_token
    access["sid"] = session.session_key
    access["role"] = session.user.role
    if getattr(session.user, "admin_role", None):
        access["adminRole"] = session.user.admin_role
    access.set_exp(lifetime=get_access_lifetime(session.user))
    session.refresh_jti = str(new_refresh["jti"])
    session.save(update_fields=["last_active", "expires_at", "refresh_jti", "updated_at"])
    return session, str(access), str(new_refresh)
