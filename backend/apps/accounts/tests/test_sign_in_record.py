"""What the admin screens say about people has to be true.

Two things weren't. Signing in issued tokens without ever writing `last_login`,
so every account — 27 of 27 — read "Never signed in" on the admin team page,
including the admin reading it. And the dashboard counted student *user rows*
while the Students page counted student *profiles*: 17 in one place, 15 in the
other, because two test sign-ups never got a profile.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, User
from common.rbac import SUPER_ADMIN


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


def test_signing_in_records_when(db):
    user = User.objects.create_user(
        email="signin@test.dev", username="signin", display_name="S",
        password="pass12345", role="student",
    )
    StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")
    assert user.last_login is None

    response = APIClient().post(
        "/api/auth/login/", {"email": user.email, "password": "pass12345"}, format="json"
    )
    assert response.status_code == 200, response.data

    user.refresh_from_db()
    assert user.last_login is not None


def test_a_failed_sign_in_records_nothing(db):
    user = User.objects.create_user(
        email="wrong@test.dev", username="wrong", display_name="W",
        password="pass12345", role="student",
    )
    APIClient().post("/api/auth/login/", {"email": user.email, "password": "nope"}, format="json")

    user.refresh_from_db()
    assert user.last_login is None


def test_the_dashboard_counts_students_the_way_the_students_page_does(db):
    with_profile = User.objects.create_user(
        email="real@test.dev", username="real", display_name="R", password="pass12345", role="student",
    )
    StudentProfile.objects.create(user=with_profile, selected_interest="Web", selected_track="React")
    # A sign-up that never got a profile: not a student anywhere else on the platform.
    User.objects.create_user(
        email="halfway@test.dev", username="halfway", display_name="H", password="pass12345", role="student",
    )
    admin = User.objects.create_user(
        email="counter@test.dev", username="counter", display_name="C",
        password="pass12345", role="admin", admin_role=SUPER_ADMIN,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    totals = client.get("/api/dashboard/admin/").json()["totals"]
    assert totals["students"] == StudentProfile.objects.count() == 1
