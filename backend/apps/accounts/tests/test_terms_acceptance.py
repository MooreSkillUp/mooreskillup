"""Agreeing to the terms, reading them, and being able to prove it.

The documents are written by a Super Admin and hosted on the platform, so the
text somebody agrees to at signup is text MooreSkillUp controls. The server
refuses a signup without agreement — a form can be skipped, an API call cannot
pretend a person said yes — and it records which versions were in force.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import PendingRegistration, User
from apps.platform.models import LegalDocument, PlatformSettings
from common.rbac import ADMIN, SUPER_ADMIN


@pytest.fixture(autouse=True)
def _open(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.student_registration_open = True
    settings.save()
    yield


def make_admin(tier, email):
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name="Admin Person",
        password="pass12345",
        role="admin",
        admin_role=tier,
    )


def as_user(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def publish(user, kind, body, title=None):
    payload = {"body": body, "title": title or dict(LegalDocument.KINDS)[kind]}
    return as_user(user).put(f"/api/admin/legal/{kind}/", payload, format="json")


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


# --- Agreement -----------------------------------------------------------------


def test_a_signup_without_agreement_is_refused(db):
    response = register()

    assert response.status_code == 400
    assert "acceptTerms" in response.data
    assert not PendingRegistration.objects.filter(email="agree@test.dev").exists()


def test_saying_no_is_the_same_as_not_answering(db):
    assert register(acceptTerms=False).status_code == 400


def test_agreement_records_the_versions_in_force(db):
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")
    publish(boss, "terms", "The rules.")
    publish(boss, "privacy", "What we keep.")

    register(acceptTerms=True)
    verify("agree@test.dev")

    user = User.objects.get(email="agree@test.dev")
    assert user.terms_accepted_at is not None
    assert user.terms_version == "terms-v1/privacy-v1"


def test_a_later_edit_is_recorded_for_later_signups(db):
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")
    publish(boss, "terms", "First wording.")
    publish(boss, "terms", "Second wording.")

    register(acceptTerms=True)
    verify("agree@test.dev")

    assert User.objects.get(email="agree@test.dev").terms_version.startswith("terms-v2")


# --- Writing them ---------------------------------------------------------------


def test_a_super_admin_publishes_and_the_version_moves(db):
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")

    first = publish(boss, "terms", "Version one.")
    second = publish(boss, "terms", "Version two.")

    assert first.data["version"] == 1
    assert second.data["version"] == 2


def test_saving_the_same_text_bumps_nothing(db):
    """A version that moves without the words moving would make the record lie."""
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")
    publish(boss, "privacy", "Unchanged.")

    again = publish(boss, "privacy", "Unchanged.")

    assert again.data["version"] == 1


def test_an_admin_can_read_the_drafts_but_not_change_them(db):
    admin = make_admin(ADMIN, "ops@test.dev")

    assert as_user(admin).get("/api/admin/legal/").status_code == 200
    assert publish(admin, "terms", "Sneaky.").status_code == 403


def test_a_student_cannot_touch_them(db):
    student = User.objects.create_user(
        email="s@test.dev", username="s", display_name="S", password="pass12345", role="student"
    )

    assert as_user(student).get("/api/admin/legal/").status_code == 403


# --- Reading them ---------------------------------------------------------------


def test_anyone_can_read_a_published_document(db):
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")
    publish(boss, "refund", "Seven days, under 30% progress.")

    doc = APIClient().get("/api/legal/refund/").data

    assert doc["body"] == "Seven days, under 30% progress."
    assert doc["isPublished"] is True
    assert "updatedByName" not in doc


def test_an_unpublished_document_shows_nothing_to_the_public(db):
    doc = APIClient().get("/api/legal/terms/").data

    assert doc["body"] == ""
    assert doc["isPublished"] is False


def test_an_unknown_document_is_a_404(db):
    assert APIClient().get("/api/legal/cookies-and-cream/").status_code == 404


def test_the_form_knows_which_documents_exist(db):
    boss = make_admin(SUPER_ADMIN, "boss@test.dev")
    publish(boss, "terms", "The rules.")

    legal = APIClient().get("/api/platform/status/").data["legal"]

    assert legal["termsUrl"] == "/legal/terms"
    assert legal["termsPublished"] is True
    assert legal["privacyPublished"] is False
