"""Agreeing to the terms, and being able to prove it.

The checkbox on the form is a convenience. What protects MooreSkillUp is the
record: this person agreed to this version of the terms at this time. So the
server refuses a signup without agreement — a form can be skipped, an API call
cannot pretend a person said yes — and it stores which version they saw.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import PendingRegistration, User
from apps.platform.models import PlatformSettings


@pytest.fixture(autouse=True)
def _open(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.student_registration_open = True
    settings.terms_version = "2026-09"
    settings.terms_url = "https://mooreskillup.com/terms"
    settings.privacy_url = "https://mooreskillup.com/privacy"
    settings.save()
    yield


def register(**extra):
    payload = {
        "email": "agree@test.dev",
        "username": "agreeing",
        "password": "password12345",
        "firstName": "Ag",
        "lastName": "Ree",
        "selectedInterest": "Web Development",
        "selectedTrack": "Frontend",
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


def test_a_signup_without_agreement_is_refused(db):
    response = register()

    assert response.status_code == 400
    assert "acceptTerms" in response.data
    assert not PendingRegistration.objects.filter(email="agree@test.dev").exists()


def test_saying_no_is_the_same_as_not_answering(db):
    assert register(acceptTerms=False).status_code == 400


def test_agreement_is_recorded_with_the_version_they_saw(db):
    register(acceptTerms=True)
    verify("agree@test.dev")

    user = User.objects.get(email="agree@test.dev")
    assert user.terms_accepted_at is not None
    assert user.terms_version == "2026-09"


def test_a_later_version_is_recorded_for_later_signups(db):
    """When the terms change, each acceptance must say which text it was."""
    settings = PlatformSettings.get_solo()
    settings.terms_version = "2027-01"
    settings.save()

    register(acceptTerms=True)
    verify("agree@test.dev")

    assert User.objects.get(email="agree@test.dev").terms_version == "2027-01"


def test_the_form_can_find_the_terms_before_anyone_has_an_account(db):
    legal = APIClient().get("/api/platform/status/").data["legal"]

    assert legal["termsUrl"] == "https://mooreskillup.com/terms"
    assert legal["privacyUrl"] == "https://mooreskillup.com/privacy"
    assert legal["termsVersion"] == "2026-09"
