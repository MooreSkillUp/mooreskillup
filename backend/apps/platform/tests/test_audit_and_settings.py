"""Phase 1 M3/M4 tests: audit trail, platform settings, maintenance mode, scheduled broadcasts."""

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.delivery import deliver_due_broadcasts
from apps.notifications.models import BroadcastNotification, Notification
from apps.platform.models import AuditLog, PlatformSettings
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN


def make_user(role, admin_role=None, email=None):
    suffix = User.objects.count() + 1
    email = email or f"{role}-{admin_role or 'none'}-{suffix}@test.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=f"Test {role.title()} {suffix}",
        password="pass12345",
        role=role,
        admin_role=admin_role,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture(autouse=True)
def clear_settings_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def super_admin(db):
    return make_user("admin", SUPER_ADMIN)


@pytest.fixture
def admin(db):
    return make_user("admin", ADMIN)


@pytest.fixture
def moderator(db):
    return make_user("admin", MODERATOR)


class TestAuditTrail:
    def test_admin_creation_is_audited(self, super_admin):
        client_for(super_admin).post(
            "/api/admin/admins/",
            {"displayName": "Ops", "email": "ops@test.dev", "adminRole": ADMIN},
            format="json",
        )
        log = AuditLog.objects.get(action="admin.create")
        assert log.actor_email == super_admin.email
        assert log.actor_role == SUPER_ADMIN
        assert log.resource_name == "Ops"

    def test_broadcast_send_is_audited(self, admin):
        client_for(admin).post(
            "/api/admin/broadcasts/",
            {"title": "Hi", "description": "There", "audience": "students"},
            format="json",
        )
        assert AuditLog.objects.filter(action="notification.broadcast").exists()

    def test_log_list_visible_to_all_tiers_and_filtered(self, super_admin, moderator):
        client_for(super_admin).post(
            "/api/admin/admins/",
            {"displayName": "X", "email": "x@test.dev", "adminRole": MODERATOR},
            format="json",
        )
        res = client_for(moderator).get("/api/admin/audit-logs/")
        assert res.status_code == 200
        assert res.json()["count"] >= 1
        res = client_for(moderator).get("/api/admin/audit-logs/?action=admin.create")
        assert all(item["action"] == "admin.create" for item in res.json()["results"])

    def test_export_super_admin_only(self, super_admin, admin):
        assert client_for(admin).get("/api/admin/audit-logs/export/").status_code == 403
        res = client_for(super_admin).get("/api/admin/audit-logs/export/")
        assert res.status_code == 200
        assert res["Content-Type"] == "text/csv"

    def test_retention_prunes_old_logs(self, super_admin):
        old_log = AuditLog.objects.create(action="admin.create", actor_email="old@test.dev")
        AuditLog.objects.filter(id=old_log.id).update(created_at=timezone.now() - timedelta(days=400))
        client_for(super_admin).get("/api/admin/audit-logs/")
        assert not AuditLog.objects.filter(id=old_log.id).exists()

    def test_audit_survives_actor_deletion(self, super_admin):
        target = make_user("admin", MODERATOR, email="gone@test.dev")
        AuditLog.objects.create(actor=target, actor_email=target.email, action="admin.update")
        target.delete()
        log = AuditLog.objects.get(action="admin.update")
        assert log.actor is None
        assert log.actor_email == "gone@test.dev"


class TestPlatformSettings:
    def test_super_admin_can_edit_admin_can_only_view(self, super_admin, admin, moderator):
        res = client_for(super_admin).patch(
            "/api/admin/settings/", {"auditRetentionDays": 30}, format="json"
        )
        assert res.status_code == 200
        assert res.json()["auditRetentionDays"] == 30
        assert AuditLog.objects.filter(action="settings.update").exists()

        assert client_for(admin).get("/api/admin/settings/").status_code == 200
        assert (
            client_for(admin)
            .patch("/api/admin/settings/", {"auditRetentionDays": 10}, format="json")
            .status_code
            == 403
        )
        assert client_for(moderator).get("/api/admin/settings/").status_code == 403

    def test_registration_toggle_blocks_signups(self, super_admin):
        client_for(super_admin).patch(
            "/api/admin/settings/", {"studentRegistrationOpen": False}, format="json"
        )
        cache.clear()
        res = APIClient().post(
            "/api/auth/register/",
            {
                "email": "new@student.dev",
                "username": "newstudent",
                "password": "pass12345",
                "selectedInterest": "Backend",
                "selectedTrack": "Python",
            },
            format="json",
        )
        assert res.status_code == 403

    def test_maintenance_mode_blocks_non_admins_allows_admins(self, super_admin, db):
        student = make_user("student")
        from apps.accounts.models import StudentProfile

        StudentProfile.objects.create(user=student, selected_interest="x", selected_track="y")

        client_for(super_admin).patch(
            "/api/admin/settings/", {"maintenanceMode": True}, format="json"
        )
        cache.clear()

        # Students are blocked with 503 (force_authenticate bypasses JWT, so use a real token)
        login = APIClient().post(
            "/api/auth/login/", {"email": student.email, "password": "pass12345"}, format="json"
        )
        token = login.json()["access"]
        student_client = APIClient(HTTP_AUTHORIZATION=f"Bearer {token}")
        assert student_client.get("/api/my-courses/").status_code == 503

        # Admins keep working
        admin_login = APIClient().post(
            "/api/auth/login/", {"email": super_admin.email, "password": "pass12345"}, format="json"
        )
        admin_client = APIClient(HTTP_AUTHORIZATION=f"Bearer {admin_login.json()['access']}")
        assert admin_client.get("/api/admin/teachers/").status_code == 200

        # Status endpoint stays open so the frontend can show the banner
        assert APIClient().get("/api/platform/status/").json()["maintenanceMode"] is True


class TestScheduledBroadcasts:
    def test_future_broadcast_is_scheduled_not_sent(self, admin, db):
        student = make_user("student")
        future = (timezone.now() + timedelta(hours=2)).isoformat()
        res = client_for(admin).post(
            "/api/admin/broadcasts/",
            {"title": "Later", "description": "Soon", "audience": "students", "scheduledAt": future},
            format="json",
        )
        assert res.json()["status"] == "scheduled"
        assert not Notification.objects.filter(user=student).exists()
        assert AuditLog.objects.filter(action="notification.schedule").exists()

    def test_due_broadcast_is_delivered(self, admin, db):
        student = make_user("student")
        broadcast = BroadcastNotification.objects.create(
            created_by=admin,
            title="Due now",
            description="Go",
            audience="students",
            status="scheduled",
            scheduled_at=timezone.now() - timedelta(minutes=1),
        )
        sent = deliver_due_broadcasts()
        assert sent == 1
        broadcast.refresh_from_db()
        assert broadcast.status == "sent"
        assert Notification.objects.filter(user=student, title="Due now").exists()
        # Second run must not double-send
        assert deliver_due_broadcasts() == 0

    def test_admins_audience_targets_admins_only(self, super_admin, admin, db):
        student = make_user("student")
        client_for(super_admin).post(
            "/api/admin/broadcasts/",
            {"title": "Team note", "description": "Admins only", "audience": "admins"},
            format="json",
        )
        assert Notification.objects.filter(user=admin, title="Team note").exists()
        assert not Notification.objects.filter(user=student, title="Team note").exists()
