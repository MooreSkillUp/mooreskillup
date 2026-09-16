"""Whether the switches on the Settings page actually switch anything.

The page says: "Turn student-facing features on or off platform-wide." Some of
them only hid a link in the sidebar.

- **Certificates.** Its own description is "Issue certificates when students
  complete certificate-enabled courses." Turned off, certificates were still
  issued on completion; the student just couldn't find the page listing them.
- **Recommendations.** Nothing read it at all, on either side.
- **Activity log retention.** Every read of the log ran a DELETE for anything
  past the window, so an ordinary page load quietly destroyed history, and
  lowering the number destroyed a lot of it at once with nothing said.
"""

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.certificates.models import Certificate
from apps.certificates.test_certificates import (
    client_for,
    complete_course,
    make_admin,
    make_course_with_lesson,
    make_student,
)
from apps.courses.models import Course
from apps.platform.models import AuditLog, PlatformSettings
from common.rbac import SUPER_ADMIN


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def taxonomy(db):
    from apps.categories.models import Category, Subcategory

    category = Category.objects.create(name="Web")
    return category, Subcategory.objects.create(category=category, name="React")


def set_flag(**flags):
    settings_row = PlatformSettings.get_solo()
    for field, value in flags.items():
        setattr(settings_row, field, value)
    settings_row.save()


class TestCertificatesSwitch:
    def test_no_certificate_is_issued_while_the_switch_is_off(self, taxonomy, db):
        set_flag(feature_certificates_enabled=False)
        category, subcategory = taxonomy
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        student, _ = make_student()

        complete_course(student, course, lesson)

        assert not Certificate.objects.exists()

    def test_asking_for_one_says_why_not(self, taxonomy, db):
        set_flag(feature_certificates_enabled=False)
        category, subcategory = taxonomy
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        student, user = make_student()
        complete_course(student, course, lesson)

        response = client_for(user).post(f"/api/certificates/{course.id}/generate/")
        assert response.status_code == 400
        assert "turned off" in response.json()["detail"].lower()

    def test_certificates_already_earned_still_verify(self, taxonomy, db):
        category, subcategory = taxonomy
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        student, _ = make_student()
        complete_course(student, course, lesson)
        code = Certificate.objects.get().certificate_code

        set_flag(feature_certificates_enabled=False)

        assert APIClient().get(f"/api/certificates/verify/{code}/").json()["valid"] is True

    def test_with_the_switch_on_it_behaves_as_before(self, taxonomy, db):
        category, subcategory = taxonomy
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        student, _ = make_student()

        complete_course(student, course, lesson)

        assert Certificate.objects.count() == 1


class TestRecommendationsSwitch:
    def test_recommendations_stop_when_turned_off(self, taxonomy, db):
        category, subcategory = taxonomy
        Course.objects.create(
            category=category, subcategory=subcategory, title="Something", subtitle="s",
            overview="o", scheme_of_work="w", status="published", visibility="visible",
        )
        student, user = make_student()

        assert client_for(user).get("/api/courses/recommended/").json() != []

        set_flag(feature_recommendations_enabled=False)
        assert client_for(user).get("/api/courses/recommended/").json() == []


class TestLogRetention:
    def old_log(self):
        log = AuditLog.objects.create(action="admin.create", actor_email="old@test.dev")
        AuditLog.objects.filter(id=log.id).update(created_at=timezone.now() - timedelta(days=400))
        return log

    def test_retention_is_enforced_once_a_day_not_once_a_page_load(self, db):
        """Every read used to issue a DELETE across the whole table.

        Retention is still real — the first read of the day applies it — but
        the reads after that leave the table alone.
        """
        self.old_log()
        admin = make_admin(SUPER_ADMIN, "super@t.dev")

        client_for(admin).get("/api/admin/audit-logs/")
        assert AuditLog.objects.filter(actor_email="old@test.dev").count() == 0

        second = self.old_log()
        client_for(admin).get("/api/admin/audit-logs/")
        assert AuditLog.objects.filter(id=second.id).exists()

    def test_lowering_the_window_does_not_wipe_history_on_the_spot(self, db):
        log = self.old_log()
        admin = make_admin(SUPER_ADMIN, "super2@t.dev")

        response = client_for(admin).patch(
            "/api/admin/settings/", {"auditRetentionDays": 7}, format="json"
        )
        assert response.status_code == 200
        assert AuditLog.objects.filter(id=log.id).exists()

    def test_the_command_prunes_too_for_a_scheduled_job(self, db):
        log = self.old_log()
        recent = AuditLog.objects.create(action="admin.update", actor_email="new@test.dev")

        call_command("prune_audit_logs")

        assert not AuditLog.objects.filter(id=log.id).exists()
        assert AuditLog.objects.filter(id=recent.id).exists()

    def test_the_admin_can_see_how_much_a_change_would_delete(self, db):
        self.old_log()
        admin = make_admin(SUPER_ADMIN, "super3@t.dev")

        response = client_for(admin).get("/api/admin/audit-logs/?to_days_ago=7&pageSize=1")

        assert response.status_code == 200
        assert response.json()["count"] == 1
