"""Where every signup came from — both answers.

`heard_about_us` is what the person says. The campaign tags are where the click
came from. They disagree often, and both are worth keeping: people misremember
which post they saw, and no campaign tag can tell you a friend recommended it
over lunch.

Neither is any use if it does not survive the email-verification step, which is
what these mostly pin.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import PendingRegistration, StudentProfile
from apps.platform.models import PlatformSettings

from .test_audit_and_settings import client_for, make_user


@pytest.fixture(autouse=True)
def _open(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.student_registration_open = True
    settings.save()
    yield


def register(email="visitor@test.dev", username="visitor", **extra):
    payload = {
        "email": email,
        "username": username,
        "password": "password12345",
        "firstName": "Vis",
        "lastName": "Itor",
        "selectedInterest": "Web Development",
        "selectedTrack": "Frontend",
        "acceptTerms": True,
    }
    payload.update(extra)
    return APIClient().post("/api/auth/register/", payload, format="json")


def verify(email):
    pending = PendingRegistration.objects.get(email=email)
    return APIClient().post(
        "/api/auth/register/verify/",
        {"pendingId": str(pending.id), "code": pending.code},
        format="json",
    )


def test_campaign_tags_survive_verification(db):
    register(
        utmSource="instagram",
        utmMedium="story",
        utmCampaign="countdown-d7",
        heardAboutUs="instagram",
    )
    verify("visitor@test.dev")

    student = StudentProfile.objects.get(user__email="visitor@test.dev")
    assert student.utm_source == "instagram"
    assert student.utm_medium == "story"
    assert student.utm_campaign == "countdown-d7"


def test_both_answers_are_kept_even_when_they_disagree(db):
    """Somebody clicks a Facebook ad and remembers it as WhatsApp. Keep both."""
    register(utmSource="facebook", heardAboutUs="whatsapp")
    verify("visitor@test.dev")

    student = StudentProfile.objects.get(user__email="visitor@test.dev")
    assert student.utm_source == "facebook"
    assert student.heard_about_us == "whatsapp"


def test_a_signup_with_no_tags_is_still_a_signup(db):
    register()

    assert verify("visitor@test.dev").status_code == 201
    student = StudentProfile.objects.get(user__email="visitor@test.dev")
    assert student.utm_source == ""


def test_an_over_long_tag_cannot_break_the_signup(db):
    register(utmCampaign="x" * 400)
    verify("visitor@test.dev")

    student = StudentProfile.objects.get(user__email="visitor@test.dev")
    assert len(student.utm_campaign) <= 120


def test_an_admin_can_read_where_students_came_from(db):
    register(utmSource="tiktok", utmCampaign="countdown-d3", heardAboutUs="tiktok")
    verify("visitor@test.dev")
    admin = make_user("admin", "super_admin", email="attribution-admin@test.dev")

    payload = client_for(admin).get("/api/admin/students/").data
    rows = payload["results"] if isinstance(payload, dict) else payload
    row = next(r for r in rows if r["email"] == "visitor@test.dev")

    assert row["utmSource"] == "tiktok"
    assert row["utmCampaign"] == "countdown-d3"
    assert row["heardAboutUs"] == "tiktok"
