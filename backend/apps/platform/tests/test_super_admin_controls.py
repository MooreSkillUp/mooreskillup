"""Settings a Super Admin can set, and whether they reach anybody.

- **Platform name** was editable on the Settings page and read by nothing: not
  the frontend, not the emails (those used an environment variable), not the
  browser tab. Renaming the platform renamed it nowhere.
- **Signed-in device limits** are the opposite problem: enforced on every login,
  but with no way to set them short of the Django admin.
"""

import pytest
from django.core import mail

from apps.platform.models import AuthenticationSettings, PlatformSettings
from common.email import send_transactional_email
from common.rbac import ADMIN, SUPER_ADMIN

from .test_audit_and_settings import client_for, make_user


@pytest.fixture
def super_admin(db):
    return make_user("admin", SUPER_ADMIN, email="boss@test.dev")


@pytest.fixture
def admin(db):
    return make_user("admin", ADMIN, email="admin@test.dev")


def test_the_platform_name_is_what_emails_call_us(db):
    settings_row = PlatformSettings.get_solo()
    settings_row.site_name = "Moore Academy"
    settings_row.save()
    mail.outbox.clear()

    send_transactional_email(
        to_email="someone@test.dev", subject="Hello", heading="Hi", intro="Welcome."
    )

    assert "Moore Academy" in mail.outbox[0].body


class TestDeviceLimits:
    def test_the_super_admin_can_change_them(self, super_admin):
        response = client_for(super_admin).patch(
            "/api/admin/auth-settings/",
            {"maxStudentDevices": 8, "maxTeacherDevices": 4, "maxAdminDevices": 2},
            format="json",
        )

        assert response.status_code == 200
        saved = AuthenticationSettings.get_solo()
        assert (saved.max_student_devices, saved.max_teacher_devices, saved.max_admin_devices) == (8, 4, 2)

    def test_a_regular_admin_cannot(self, admin):
        response = client_for(admin).patch(
            "/api/admin/auth-settings/", {"maxStudentDevices": 99}, format="json"
        )

        assert response.status_code == 403
        assert AuthenticationSettings.get_solo().max_student_devices == 5

    def test_zero_devices_is_refused(self, super_admin):
        """Zero would lock everyone out of their own account at the next login."""
        response = client_for(super_admin).patch(
            "/api/admin/auth-settings/", {"maxStudentDevices": 0}, format="json"
        )

        assert response.status_code == 400
        assert AuthenticationSettings.get_solo().max_student_devices == 5
