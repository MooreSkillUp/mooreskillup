"""A new teacher password has to reach the teacher, one way or the other.

Resending an invite reset the password and emailed it. With production on the
console email backend, nothing was delivered and nothing came back to the admin
either — the teacher was locked out with a password nobody had. Creation had the
opposite problem: it always returned the password, even when it had been emailed.
"""

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from common.rbac import SUPER_ADMIN

DELIVERS = "anymail.backends.test.EmailBackend"
SILENT = "django.core.mail.backends.console.EmailBackend"


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def admin_client(db):
    admin = User.objects.create_user(
        email="ops@test.dev", username="ops", display_name="Ops",
        password="pass12345", role="admin", admin_role=SUPER_ADMIN,
    )
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


def create_teacher(client, email):
    response = client.post(
        "/api/admin/teachers/",
        {"email": email, "displayName": "New Teacher", "program": "Web Development", "track": "Frontend"},
        format="json",
    )
    assert response.status_code == 201, response.data
    return response.json()


@override_settings(EMAIL_BACKEND=DELIVERS)
def test_a_password_that_was_emailed_is_not_shown_to_the_admin(admin_client):
    body = create_teacher(admin_client, "emailed@test.dev")
    assert body["emailDelivered"] is True
    assert body["temporaryPassword"] is None


@override_settings(EMAIL_BACKEND=SILENT)
def test_when_email_is_off_the_admin_gets_a_password_that_works(admin_client):
    body = create_teacher(admin_client, "handoff@test.dev")
    assert body["emailDelivered"] is False
    assert body["temporaryPassword"]
    assert User.objects.get(email="handoff@test.dev").check_password(body["temporaryPassword"])


@override_settings(EMAIL_BACKEND=SILENT)
def test_resending_an_invite_with_email_off_does_not_lock_the_teacher_out(admin_client):
    created = create_teacher(admin_client, "locked@test.dev")
    old_password = created["temporaryPassword"]
    teacher = TeacherProfile.objects.get(user__email="locked@test.dev")

    response = admin_client.post(f"/api/admin/teachers/{teacher.id}/resend-invite/")
    assert response.status_code == 200, response.data
    body = response.json()

    user = User.objects.get(email="locked@test.dev")
    assert body["emailDelivered"] is False
    assert user.check_password(body["temporaryPassword"]), "the admin must get the password that now works"
    assert not user.check_password(old_password)
    assert "isn't being delivered" in body["detail"]


@override_settings(EMAIL_BACKEND=DELIVERS)
def test_resending_with_email_on_says_emailed_and_shows_nothing(admin_client):
    create_teacher(admin_client, "resent@test.dev")
    teacher = TeacherProfile.objects.get(user__email="resent@test.dev")

    body = admin_client.post(f"/api/admin/teachers/{teacher.id}/resend-invite/").json()
    assert body["emailDelivered"] is True
    assert body["temporaryPassword"] is None
    assert "emailed" in body["detail"]
