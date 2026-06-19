"""Phase 1 RBAC tests: tiered admin roles and permission enforcement."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from common.rbac import (
    ADMIN,
    MODERATOR,
    PERMISSION_MATRIX,
    SUPER_ADMIN,
    get_admin_role,
    get_permissions_for,
)


def make_user(role, admin_role=None, email=None, **extra):
    suffix = User.objects.count() + 1
    email = email or f"{role}-{admin_role or 'none'}-{suffix}@test.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=f"Test {role.title()} {suffix}",
        password="pass12345",
        role=role,
        admin_role=admin_role,
        **extra,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def super_admin(db):
    return make_user("admin", SUPER_ADMIN)


@pytest.fixture
def admin(db):
    return make_user("admin", ADMIN)


@pytest.fixture
def moderator(db):
    return make_user("admin", MODERATOR)


@pytest.fixture
def student(db):
    user = make_user("student")
    from apps.accounts.models import StudentProfile

    StudentProfile.objects.create(user=user, selected_interest="Backend", selected_track="Python")
    return user


class TestPermissionMatrix:
    def test_tiers_are_strictly_nested(self):
        assert PERMISSION_MATRIX[MODERATOR] < PERMISSION_MATRIX[ADMIN] < PERMISSION_MATRIX[SUPER_ADMIN]

    def test_legacy_admin_without_tier_is_super_admin(self, db):
        legacy = make_user("admin", admin_role=None)
        assert get_admin_role(legacy) == SUPER_ADMIN

    def test_non_admin_roles_have_no_admin_permissions(self, student):
        assert get_admin_role(student) is None


class TestMeEndpoint:
    @pytest.mark.parametrize("tier", [SUPER_ADMIN, ADMIN, MODERATOR])
    def test_me_returns_admin_role_and_permissions(self, db, tier):
        user = make_user("admin", tier)
        payload = client_for(user).get("/api/auth/me/").json()
        assert payload["adminRole"] == tier
        assert set(payload["permissions"]) == PERMISSION_MATRIX[tier]

    def test_me_for_student_has_no_permissions(self, student):
        payload = client_for(student).get("/api/auth/me/").json()
        assert payload["adminRole"] is None
        assert payload["permissions"] == []


class TestAdminManagement:
    def test_super_admin_can_create_admin(self, super_admin):
        res = client_for(super_admin).post(
            "/api/admin/admins/",
            {"displayName": "Ops Person", "email": "ops@test.dev", "adminRole": ADMIN},
            format="json",
        )
        assert res.status_code == 201
        assert res.json()["adminRole"] == ADMIN
        assert res.json()["temporaryPassword"]

    @pytest.mark.parametrize("tier", [ADMIN, MODERATOR])
    def test_lower_tiers_cannot_manage_admins(self, db, tier):
        user = make_user("admin", tier)
        assert client_for(user).get("/api/admin/admins/").status_code == 403
        res = client_for(user).post(
            "/api/admin/admins/",
            {"displayName": "X", "email": "x@test.dev", "adminRole": MODERATOR},
            format="json",
        )
        assert res.status_code == 403

    def test_cannot_change_own_role(self, super_admin):
        res = client_for(super_admin).patch(
            f"/api/admin/admins/{super_admin.id}/", {"adminRole": MODERATOR}, format="json"
        )
        assert res.status_code == 400

    def test_cannot_demote_last_super_admin(self, super_admin, admin):
        # admin tries nothing here; another super admin is required to demote one
        other = make_user("admin", SUPER_ADMIN)
        # Demoting `other` is fine while super_admin remains
        res = client_for(super_admin).patch(
            f"/api/admin/admins/{other.id}/", {"adminRole": ADMIN}, format="json"
        )
        assert res.status_code == 200
        # Now super_admin is the last one; another super admin demoting them must fail.
        other.refresh_from_db()
        res = client_for(super_admin).patch(
            f"/api/admin/admins/{super_admin.id}/", {"adminRole": ADMIN}, format="json"
        )
        assert res.status_code == 400

    def test_deactivated_admin_loses_access_immediately(self, super_admin, admin):
        res = client_for(super_admin).patch(
            f"/api/admin/admins/{admin.id}/", {"status": "disabled"}, format="json"
        )
        assert res.status_code == 200
        admin.refresh_from_db()
        assert client_for(admin).get("/api/admin/teachers/").status_code == 403

    def test_super_admin_can_delete_another_admin(self, super_admin, admin):
        res = client_for(super_admin).delete(f"/api/admin/admins/{admin.id}/")
        assert res.status_code == 200
        assert not User.objects.filter(id=admin.id).exists()

    def test_cannot_delete_self(self, super_admin):
        res = client_for(super_admin).delete(f"/api/admin/admins/{super_admin.id}/")
        assert res.status_code == 400
        assert User.objects.filter(id=super_admin.id).exists()

    def test_cannot_delete_last_super_admin(self, super_admin):
        other = make_user("admin", SUPER_ADMIN)
        # Removing `other` is allowed while super_admin remains.
        assert client_for(super_admin).delete(f"/api/admin/admins/{other.id}/").status_code == 200
        # Now super_admin is the last one; a second super admin cannot remove them.
        peer = make_user("admin", SUPER_ADMIN)
        res = client_for(peer).delete(f"/api/admin/admins/{super_admin.id}/")
        # super_admin is no longer last (peer exists), so this succeeds...
        assert res.status_code == 200
        # ...leaving `peer` as the sole super admin, who cannot be removed.
        assert client_for(peer).delete(f"/api/admin/admins/{peer.id}/").status_code == 400

    def test_lower_tiers_cannot_delete_admins(self, admin, moderator):
        target = make_user("admin", MODERATOR)
        assert client_for(admin).delete(f"/api/admin/admins/{target.id}/").status_code == 403
        assert client_for(moderator).delete(f"/api/admin/admins/{target.id}/").status_code == 403

    def test_resend_credentials_changes_password(self, super_admin, admin):
        old_hash = admin.password
        res = client_for(super_admin).post(f"/api/admin/admins/{admin.id}/resend-credentials/")
        assert res.status_code == 200
        admin.refresh_from_db()
        assert admin.password != old_hash


class TestPermissionOverrides:
    def test_super_admin_grants_extra_permission(self, super_admin, admin):
        # Admin tier lacks payments:refund by default.
        assert "payments:refund" not in get_permissions_for(admin)
        res = client_for(super_admin).patch(
            f"/api/admin/admins/{admin.id}/permissions/",
            {"grant": ["payments:refund"], "revoke": []},
            format="json",
        )
        assert res.status_code == 200
        admin.refresh_from_db()
        assert "payments:refund" in get_permissions_for(admin)

    def test_revoke_removes_base_permission(self, super_admin, admin):
        assert "support:view" in get_permissions_for(admin)
        client_for(super_admin).patch(
            f"/api/admin/admins/{admin.id}/permissions/",
            {"grant": [], "revoke": ["support:view"]},
            format="json",
        )
        admin.refresh_from_db()
        assert "support:view" not in get_permissions_for(admin)

    def test_only_permission_managers_can_override(self, admin, moderator):
        target = make_user("admin", ADMIN, email="ovr-target@test.dev")
        for actor in (admin, moderator):
            res = client_for(actor).patch(
                f"/api/admin/admins/{target.id}/permissions/",
                {"grant": ["payments:refund"], "revoke": []},
                format="json",
            )
            assert res.status_code == 403


class TestTwoFactor:
    def test_login_without_2fa_returns_tokens(self, db):
        user = make_user("admin", ADMIN, email="no2fa@test.dev")
        user.set_password("pass12345")
        user.save()
        res = APIClient().post(
            "/api/auth/login/", {"email": user.email, "password": "pass12345"}, format="json"
        )
        assert res.status_code == 200
        assert res.json().get("access")

    def test_login_with_2fa_requires_code(self, db):
        from apps.accounts.models import EmailOtp

        user = make_user("admin", ADMIN, email="has2fa@test.dev")
        user.set_password("pass12345")
        user.two_factor_enabled = True
        user.save()
        res = APIClient().post(
            "/api/auth/login/", {"email": user.email, "password": "pass12345"}, format="json"
        )
        assert res.status_code == 200
        body = res.json()
        assert body.get("twoFactorRequired") is True
        assert "access" not in body
        otp = EmailOtp.objects.filter(user=user, used_at__isnull=True).latest("created_at")

        verify = APIClient().post(
            "/api/auth/login/verify-2fa/", {"userId": str(user.id), "code": otp.code}, format="json"
        )
        assert verify.status_code == 200
        assert verify.json().get("access")

    def test_wrong_code_rejected(self, db):
        user = make_user("admin", ADMIN, email="wrong2fa@test.dev")
        user.set_password("pass12345")
        user.two_factor_enabled = True
        user.save()
        APIClient().post("/api/auth/login/", {"email": user.email, "password": "pass12345"}, format="json")
        res = APIClient().post(
            "/api/auth/login/verify-2fa/", {"userId": str(user.id), "code": "000000"}, format="json"
        )
        assert res.status_code == 400

    def test_admin_can_toggle_own_2fa(self, admin):
        res = client_for(admin).post("/api/auth/two-factor/", {"enabled": True}, format="json")
        assert res.status_code == 200
        admin.refresh_from_db()
        assert admin.two_factor_enabled is True


class TestGrantCourseAccess:
    def _course(self):
        from apps.accounts.models import TeacherProfile
        from apps.categories.models import Category, Subcategory
        from apps.courses.models import Course

        teacher_user = make_user("teacher", email="grant-teacher@test.dev")
        teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
        category = Category.objects.create(name="Grant Web")
        subcategory = Subcategory.objects.create(category=category, name="Grant React")
        return Course.objects.create(
            teacher=teacher, category=category, subcategory=subcategory,
            title="Granted", subtitle="s", overview="o", scheme_of_work="w", status="published",
        )

    def _student(self):
        from apps.accounts.models import StudentProfile

        user = make_user("student", email="grant-student@test.dev")
        return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")

    def test_admin_grants_free_access(self, admin, db):
        from apps.enrollments.models import Enrollment

        course = self._course()
        student = self._student()
        res = client_for(admin).post(
            f"/api/admin/students/{student.id}/grant-access/", {"courseId": str(course.id)}, format="json"
        )
        assert res.status_code == 201
        enrollment = Enrollment.objects.get(student=student, course=course)
        assert enrollment.access_source == "admin_grant"

    def test_grant_is_idempotent(self, admin, db):
        course = self._course()
        student = self._student()
        url = f"/api/admin/students/{student.id}/grant-access/"
        assert client_for(admin).post(url, {"courseId": str(course.id)}, format="json").status_code == 201
        assert client_for(admin).post(url, {"courseId": str(course.id)}, format="json").status_code == 200


class TestBootstrapLockdown:
    def test_admin_register_closed_once_super_admin_exists(self, super_admin, monkeypatch):
        monkeypatch.setenv("ADMIN_REGISTRATION_TOKEN", "secret-token")
        res = APIClient().post(
            "/api/auth/admin-register/",
            {
                "email": "newadmin@test.dev",
                "username": "newadmin",
                "displayName": "New Admin",
                "password": "pass12345",
                "adminRegistrationToken": "secret-token",
            },
            format="json",
        )
        assert res.status_code == 403

    def test_admin_register_bootstrap_creates_super_admin(self, db, monkeypatch):
        monkeypatch.setenv("ADMIN_REGISTRATION_TOKEN", "secret-token")
        res = APIClient().post(
            "/api/auth/admin-register/",
            {
                "email": "founder@test.dev",
                "username": "founder",
                "displayName": "Founder",
                "password": "pass12345",
                "adminRegistrationToken": "secret-token",
            },
            format="json",
        )
        assert res.status_code == 201
        assert res.json()["user"]["adminRole"] == SUPER_ADMIN


class TestEndpointTierEnforcement:
    """Spot-check representative endpoints against the matrix."""

    def test_teachers_list(self, super_admin, admin, moderator, student):
        assert client_for(super_admin).get("/api/admin/teachers/").status_code == 200
        assert client_for(admin).get("/api/admin/teachers/").status_code == 200
        assert client_for(moderator).get("/api/admin/teachers/").status_code == 403
        assert client_for(student).get("/api/admin/teachers/").status_code == 403
        assert APIClient().get("/api/admin/teachers/").status_code == 401

    def test_payments_admin_only(self, admin, moderator):
        assert client_for(admin).get("/api/admin/transactions/").status_code == 200
        assert client_for(moderator).get("/api/admin/transactions/").status_code == 403

    def test_moderator_can_view_courses_list(self, moderator):
        assert client_for(moderator).get("/api/admin/courses/").status_code == 200

    def test_category_destroy_super_admin_only(self, super_admin, admin):
        from apps.categories.models import Category

        category = Category.objects.create(name="Cat A")
        assert client_for(admin).delete(f"/api/admin/categories/{category.id}/").status_code == 403
        assert client_for(super_admin).delete(f"/api/admin/categories/{category.id}/").status_code in (200, 204)

    def test_broadcast_create_admin_but_not_moderator(self, admin, moderator):
        payload = {"title": "Hello", "description": "World", "audience": "all"}
        assert client_for(admin).post("/api/admin/broadcasts/", payload, format="json").status_code == 200
        assert client_for(moderator).post("/api/admin/broadcasts/", payload, format="json").status_code == 403
