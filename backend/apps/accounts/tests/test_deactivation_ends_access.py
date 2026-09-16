"""Turning an account off has to turn its access off.

Suspending a student, deactivating a teacher and deactivating an admin each set
`is_active = False`. Whether that actually ends access depends on two things the
code did not obviously guarantee: that an access token already issued stops
working, and that a live session can't simply refresh itself a new one.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.accounts.session_auth import create_user_session, refresh_session_from_token
from common.rbac import MODERATOR, SUPER_ADMIN


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def super_admin(db):
    admin = User.objects.create_user(
        email="root@test.dev", username="root", display_name="Root",
        password="pass12345", role="admin", admin_role=SUPER_ADMIN,
    )
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


def signed_in(user):
    _session, access, refresh = create_user_session(user)
    access, refresh = str(access), str(refresh)
    assert APIClient().get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}").status_code == 200
    return access, refresh


def assert_locked_out(access, refresh):
    me = APIClient().get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
    assert me.status_code in (401, 403), f"an issued access token still works ({me.status_code})"
    with pytest.raises(TokenError):
        refresh_session_from_token(refresh)


def test_a_suspended_student_loses_access(super_admin):
    user = User.objects.create_user(
        email="student@test.dev", username="student", display_name="S", password="pass12345", role="student",
    )
    profile = StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")
    access, refresh = signed_in(user)

    response = super_admin.patch(f"/api/admin/students/{profile.id}/", {"status": "disabled"}, format="json")
    assert response.status_code == 200, response.data
    assert_locked_out(access, refresh)


def test_a_deactivated_teacher_loses_access(super_admin):
    user = User.objects.create_user(
        email="teacher@test.dev", username="teacher", display_name="T", password="pass12345", role="teacher",
    )
    profile = TeacherProfile.objects.create(user=user, program="Web", track="React")
    access, refresh = signed_in(user)

    response = super_admin.patch(f"/api/admin/teachers/{profile.id}/", {"status": "inactive"}, format="json")
    assert response.status_code == 200, response.data
    assert_locked_out(access, refresh)


def test_a_deactivated_admin_loses_access(super_admin):
    user = User.objects.create_user(
        email="mod@test.dev", username="mod", display_name="M", password="pass12345",
        role="admin", admin_role=MODERATOR,
    )
    access, refresh = signed_in(user)

    response = super_admin.patch(f"/api/admin/admins/{user.id}/", {"status": "disabled"}, format="json")
    assert response.status_code == 200, response.data
    assert_locked_out(access, refresh)
