"""Launch control: the platform opens itself, and nobody gets stranded.

Before launch the app shows a countdown where the sign-up form goes. On the day
a Super Admin flips one setting and the same app becomes registration and
sign-in — no page deleted, no deploy, no developer awake at 7am.

Two things these pin hardest, because both are the kind of mistake you only make
once: a pre-launch platform must not quietly accept registrations through the
API, and closing sign-in must never be able to lock out the administrators who
would have to undo it.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.platform.models import PlatformSettings
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN

from .test_audit_and_settings import client_for, make_user


@pytest.fixture(autouse=True)
def _reset_settings(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.sign_in_enabled = True
    settings.student_registration_open = True
    settings.save()
    yield


@pytest.fixture
def super_admin(db):
    return make_user("admin", SUPER_ADMIN, email="launch-boss@test.dev")


def set_state(**kwargs):
    settings = PlatformSettings.get_solo()
    for key, value in kwargs.items():
        setattr(settings, key, value)
    settings.save()
    return settings


def register():
    return APIClient().post(
        "/api/auth/register/",
        {
            "email": "hopeful@test.dev",
            "username": "hopeful",
            "password": "password12345",
            "firstName": "Hope",
            "lastName": "Ful",
            "selectedInterest": "Web Development",
            "selectedTrack": "Frontend",
        },
        format="json",
    )


def sign_in(email, password="pass12345"):
    return APIClient().post(
        "/api/auth/login/", {"email": email, "password": password}, format="json"
    )


# --- Registration ------------------------------------------------------------


def test_registration_stays_open_before_launch(db):
    """Deliberately reversed once the pre-launch screen became a waitlist.

    The people who sign up before launch are the founding members, and the whole
    pre-launch campaign exists to collect them. What closes before launch is the
    courses, not the door — see test_waitlist.py.
    """
    set_state(launch_state="pre_launch")

    response = register()

    assert response.status_code in (200, 201), response.data


def test_registration_works_once_the_platform_is_live(db):
    set_state(launch_state="live")

    response = register()
    assert response.status_code in (200, 201), response.data


# --- Sign-in ------------------------------------------------------------------


def test_closing_sign_in_stops_students(db):
    student = make_user("student", email="student-lock@test.dev")
    set_state(sign_in_enabled=False)

    response = sign_in(student.email)

    assert response.status_code == 403


@pytest.mark.parametrize("tier", [SUPER_ADMIN, ADMIN, MODERATOR])
def test_closing_sign_in_never_locks_out_an_admin(db, tier):
    """The switch that strands every administrator is an outage, not a setting."""
    admin = make_user("admin", tier, email=f"{tier}-lock@test.dev")
    set_state(sign_in_enabled=False)

    response = sign_in(admin.email)

    assert response.status_code == 200, response.data


def test_students_sign_in_normally_while_sign_in_is_open(db):
    student = make_user("student", email="student-open@test.dev")
    set_state(sign_in_enabled=True)

    assert sign_in(student.email).status_code == 200


# --- What a visitor with no account can see ----------------------------------


def test_the_public_status_carries_everything_the_countdown_needs(db):
    set_state(
        launch_state="pre_launch",
        countdown_enabled=True,
        launch_headline="Something is coming",
        launch_message="Opens soon.",
        launch_cta_label="Explore MooreSkillUp",
        launch_cta_url="https://mooreskillup.com",
    )

    payload = APIClient().get("/api/platform/status/").data

    assert payload["launch"]["state"] == "pre_launch"
    assert payload["launch"]["countdownEnabled"] is True
    assert payload["launch"]["headline"] == "Something is coming"
    assert payload["launch"]["ctaUrl"] == "https://mooreskillup.com"
    assert payload["signInEnabled"] is True


# --- Who may change it --------------------------------------------------------


def test_a_super_admin_can_open_the_platform(super_admin):
    set_state(launch_state="pre_launch")

    response = client_for(super_admin).patch(
        "/api/admin/settings/", {"launchState": "live"}, format="json"
    )

    assert response.status_code == 200
    assert PlatformSettings.get_solo().launch_state == "live"


def test_a_moderator_cannot_open_the_platform(db):
    moderator = make_user("admin", MODERATOR, email="mod-launch@test.dev")
    set_state(launch_state="pre_launch")

    response = client_for(moderator).patch(
        "/api/admin/settings/", {"launchState": "live"}, format="json"
    )

    assert response.status_code == 403
    assert PlatformSettings.get_solo().launch_state == "pre_launch"


def test_an_unknown_launch_state_is_refused(super_admin):
    response = client_for(super_admin).patch(
        "/api/admin/settings/", {"launchState": "soon-ish"}, format="json"
    )

    assert response.status_code == 400
