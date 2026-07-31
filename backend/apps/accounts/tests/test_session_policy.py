"""Session policy: how long a signed-in user stays signed in, on how many
devices, and whether the browser will actually send the refresh cookie back.

These were the three causes behind "the app logs me out after a while".
"""

from datetime import timedelta

import pytest
from django.test import override_settings

from apps.accounts.models import StudentProfile, User, UserSession
from apps.accounts.session_auth import (
    AUTH_REFRESH_COOKIE,
    _cookie_samesite,
    _cookie_secure,
    create_user_session,
    enforce_device_limit,
    get_refresh_lifetime,
    refresh_session_from_token,
)
from apps.platform.models import AuthenticationSettings


def make_student(email="s@test.dev"):
    user = User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name="Test Student",
        password="password123",
        role="student",
    )
    StudentProfile.objects.create(user=user)
    return user


class TestRefreshLifetime:
    def test_students_get_a_long_window(self, db):
        student = make_student()
        assert get_refresh_lifetime(student) == timedelta(days=90)

    def test_staff_windows_stay_short(self, db):
        teacher = User.objects.create_user(
            email="t@test.dev",
            username="t",
            display_name="Tess Teacher",
            password="password123",
            role="teacher",
        )
        admin = User.objects.create_user(
            email="a@test.dev",
            username="a",
            display_name="Ada Admin",
            password="password123",
            role="admin",
        )
        assert get_refresh_lifetime(teacher) == timedelta(days=14)
        assert get_refresh_lifetime(admin) == timedelta(days=7)

    def test_refreshing_slides_the_expiry_forward(self, db):
        """An active student must never age out mid-course."""
        student = make_student()
        session, _access, refresh = create_user_session(student)

        # Pretend the session was created a month ago and is drifting toward expiry.
        original_expiry = session.expires_at - timedelta(days=30)
        UserSession.objects.filter(pk=session.pk).update(expires_at=original_expiry)

        refreshed, _new_access, _new_refresh = refresh_session_from_token(refresh)
        assert refreshed.expires_at > original_expiry


class TestDeviceLimit:
    def test_default_allows_five_student_devices(self, db):
        assert AuthenticationSettings.get_solo().max_student_devices == 5

    def test_a_student_can_hold_several_sessions_at_once(self, db):
        student = make_student()
        for _ in range(5):
            create_user_session(student)
        assert UserSession.objects.filter(user=student, is_active=True).count() == 5

    def test_the_oldest_session_is_dropped_past_the_limit(self, db):
        """The cap still exists so one shared password cannot serve a class."""
        student = make_student()
        sessions = [create_user_session(student)[0] for _ in range(5)]

        enforce_device_limit(student)
        create_user_session(student)

        sessions[0].refresh_from_db()
        assert sessions[0].is_active is False
        assert UserSession.objects.filter(user=student, is_active=True).count() <= 5


class TestCookiePolicy:
    """The frontend and this API are on different registrable domains, so the
    refresh call is cross-site. Browsers drop SameSite=Lax cookies on those."""

    @override_settings(AUTH_COOKIE_SAMESITE="None")
    def test_cross_site_cookies_are_marked_none_and_secure(self, db):
        assert _cookie_samesite() == "None"
        # SameSite=None without Secure is rejected outright by browsers.
        assert _cookie_secure() is True

    @override_settings(AUTH_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=False)
    def test_same_domain_setups_keep_the_safer_default(self, db):
        assert _cookie_samesite() == "Lax"
        assert _cookie_secure() is False

    @override_settings(AUTH_COOKIE_SAMESITE="nonsense")
    def test_an_unusable_value_falls_back_to_lax(self, db):
        assert _cookie_samesite() == "Lax"

    @override_settings(AUTH_COOKIE_SAMESITE="None")
    def test_login_sets_a_refresh_cookie_the_browser_will_send_back(self, db, client):
        student = make_student("login@test.dev")
        response = client.post(
            "/api/auth/login/",
            {"email": student.email, "password": "password123"},
            content_type="application/json",
        )
        assert response.status_code == 200

        cookie = response.cookies[AUTH_REFRESH_COOKIE]
        assert cookie["samesite"] == "None"
        assert cookie["secure"]
        assert cookie["httponly"]
        # 90 days, so a student who steps away for a term is still signed in.
        assert int(cookie["max-age"]) == int(timedelta(days=90).total_seconds())


@pytest.mark.django_db
def test_access_tokens_stay_short_lived():
    """The long refresh window is safe precisely because access tokens are not."""
    from apps.accounts.session_auth import get_access_lifetime

    assert get_access_lifetime(make_student("short@test.dev")) == timedelta(minutes=30)
