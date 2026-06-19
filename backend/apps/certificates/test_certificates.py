"""Phase 2 T7: certificate issuance, verification, revoke, and announcement toggles."""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.certificates.models import Certificate
from apps.courses.models import Course, Lesson, Section
from apps.enrollments.models import Enrollment
from apps.platform.models import PlatformSettings
from apps.progress.models import LessonProgress
from common.rbac import MODERATOR, SUPER_ADMIN


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def taxonomy(db):
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return category, subcategory


def make_student(email="s@t.dev"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="Jane Doe", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React"), user


def make_admin(admin_role, email):
    return User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="A", password="pass12345",
        role="admin", admin_role=admin_role,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def make_course_with_lesson(category, subcategory, certificate_enabled):
    course = Course.objects.create(
        category=category, subcategory=subcategory, title="React Mastery", subtitle="s",
        overview="o", scheme_of_work="w", status="published", visibility="visible",
        certificate_enabled=certificate_enabled,
    )
    section = Section.objects.create(course=course, title="S", description="d", order=1, is_published=True)
    lesson = Lesson.objects.create(section=section, title="L", content_type="text", text_content="hi", order=1, is_published=True)
    return course, lesson


def complete_course(student, course, lesson):
    from apps.progress.views import refresh_course_progress

    enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")
    LessonProgress.objects.create(enrollment=enrollment, lesson=lesson, status="completed")
    refresh_course_progress(enrollment)
    return enrollment


class TestCertificateIssuance:
    def test_issued_only_when_certificate_enabled(self, taxonomy, db):
        category, subcategory = taxonomy
        student, _ = make_student()
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        complete_course(student, course, lesson)
        assert Certificate.objects.filter(student=student, course=course).count() == 1
        cert = Certificate.objects.get(student=student, course=course)
        assert cert.certificate_code.startswith("MSU-")
        assert "/verify/" in cert.verification_url

    def test_not_issued_when_disabled(self, taxonomy, db):
        category, subcategory = taxonomy
        student, _ = make_student("s2@t.dev")
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=False)
        complete_course(student, course, lesson)
        assert Certificate.objects.filter(student=student, course=course).count() == 0


class TestVerification:
    def test_public_verify_valid_and_revoked(self, taxonomy, db):
        category, subcategory = taxonomy
        student, _ = make_student("s3@t.dev")
        course, lesson = make_course_with_lesson(category, subcategory, certificate_enabled=True)
        complete_course(student, course, lesson)
        cert = Certificate.objects.get(student=student, course=course)

        # Public, no auth.
        res = APIClient().get(f"/api/certificates/verify/{cert.certificate_code}/")
        assert res.status_code == 200
        assert res.json()["valid"] is True
        assert res.json()["studentName"] == "Jane Doe"
        assert res.json()["courseTitle"] == "React Mastery"

        # Revoke → verification returns invalid.
        super_admin = make_admin(SUPER_ADMIN, "super@t.dev")
        revoke = client_for(super_admin).post(f"/api/admin/certificates/{cert.id}/revoke/")
        assert revoke.status_code == 200
        assert APIClient().get(f"/api/certificates/verify/{cert.certificate_code}/").json()["valid"] is False

    def test_unknown_code_is_invalid(self, db):
        assert APIClient().get("/api/certificates/verify/MSU-NOPE/").json()["valid"] is False


class TestTemplatePermissions:
    def test_only_super_admin_edits_template(self, db):
        moderator = make_admin(MODERATOR, "mod@t.dev")
        super_admin = make_admin(SUPER_ADMIN, "super2@t.dev")
        # Moderator cannot view (needs admin-settings:view)
        assert client_for(moderator).get("/api/admin/certificates/template/").status_code == 403
        res = client_for(super_admin).patch(
            "/api/admin/certificates/template/", {"signatoryName": "Dr Moore"}, format="json"
        )
        assert res.status_code == 200
        assert res.json()["signatoryName"] == "Dr Moore"


class TestAnnouncementToggles:
    def _teacher_with_students(self, category, subcategory):
        user = User.objects.create_user(
            email="t@t.dev", username="t", display_name="T", password="pass12345", role="teacher"
        )
        profile = TeacherProfile.objects.create(user=user, program="Web", track="React")
        course = Course.objects.create(
            teacher=profile, category=category, subcategory=subcategory, title="C", subtitle="s",
            overview="o", scheme_of_work="w",
        )
        student, student_user = make_student("learner@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="free")
        return user, student_user

    def test_teacher_announcement_blocked_when_off(self, taxonomy, db):
        category, subcategory = taxonomy
        teacher_user, _ = self._teacher_with_students(category, subcategory)
        res = client_for(teacher_user).post(
            "/api/teacher/announcements/", {"title": "Hi", "description": "There"}, format="json"
        )
        assert res.status_code == 403

    def test_teacher_announcement_reaches_students_when_on(self, taxonomy, db):
        category, subcategory = taxonomy
        PlatformSettings.objects.update_or_create(pk=1, defaults={"allow_teacher_announcements": True})
        cache.clear()
        teacher_user, student_user = self._teacher_with_students(category, subcategory)
        res = client_for(teacher_user).post(
            "/api/teacher/announcements/", {"title": "Class", "description": "Tomorrow 5pm"}, format="json"
        )
        assert res.status_code == 201
        assert res.json()["recipients"] == 1
        from apps.notifications.models import Notification

        assert Notification.objects.filter(user=student_user, title="Class").exists()
