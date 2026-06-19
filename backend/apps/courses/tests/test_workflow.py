"""Phase 2 T6: duplicate, version history/restore, approval hierarchy."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, CourseVersion, Lesson, Project, Section, Task
from apps.platform.models import PlatformSettings
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN
from django.core.cache import cache


def make_teacher(email="t@test.dev"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="T", password="pass12345", role="teacher"
    )
    return user, TeacherProfile.objects.create(user=user, program="Web", track="React")


def make_admin(admin_role, email):
    return User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="A", password="pass12345",
        role="admin", admin_role=admin_role,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def taxonomy(db):
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return category, subcategory


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


def make_full_course(profile, category, subcategory):
    course = Course.objects.create(
        teacher=profile, category=category, subcategory=subcategory,
        title="Original", subtitle="s", overview="o", scheme_of_work="w",
    )
    section = Section.objects.create(course=course, title="S1", description="d", order=1)
    Lesson.objects.create(section=section, title="L1", content_type="video", video_url="https://youtu.be/abc", order=1)
    Task.objects.create(section=section, title="A1", instructions="do", submission_type="whatsapp_group", submission_url="https://chat.whatsapp.com/x", order=1)
    Project.objects.create(section=section, title="P1", description="build", order=1)
    return course


class TestDuplicate:
    def test_duplicate_clones_full_structure(self, taxonomy, db):
        category, subcategory = taxonomy
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)

        res = client_for(user).post(f"/api/teacher/courses/{course.id}/duplicate/")
        assert res.status_code == 201
        new_id = res.json()["id"]
        assert new_id != str(course.id)
        new_course = Course.objects.get(id=new_id)
        assert new_course.title == "Original (Copy)"
        assert new_course.status == "draft"
        section = new_course.sections.first()
        assert section.lessons.count() == 1
        assert section.tasks.count() == 1
        assert section.projects.count() == 1
        # Original untouched
        assert Course.objects.filter(teacher=profile).count() == 2


class TestVersionHistory:
    def test_submit_creates_version_and_restore_rebuilds(self, taxonomy, db):
        category, subcategory = taxonomy
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)

        # Submitting for review snapshots the course.
        client_for(user).post(f"/api/teacher/courses/{course.id}/publish/")
        assert CourseVersion.objects.filter(course=course).count() == 1
        version = CourseVersion.objects.get(course=course)

        # Mutate the course: delete its content.
        course.sections.all().delete()
        assert Section.objects.filter(course=course).count() == 0

        # Restore brings the structure back.
        res = client_for(user).post(f"/api/teacher/courses/{course.id}/versions/{version.id}/restore/")
        assert res.status_code == 200
        assert Section.objects.filter(course=course).count() == 1
        restored_section = Section.objects.get(course=course)
        assert restored_section.lessons.count() == 1
        assert restored_section.projects.count() == 1

    def test_versions_listed_for_teacher(self, taxonomy, db):
        category, subcategory = taxonomy
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)
        client_for(user).post(f"/api/teacher/courses/{course.id}/publish/")
        res = client_for(user).get(f"/api/teacher/courses/{course.id}/versions/")
        assert res.status_code == 200
        assert res.json()[0]["versionNumber"] == 1


class TestDeletionWorkflow:
    def test_teacher_delete_requests_not_deletes(self, taxonomy, db):
        category, subcategory = taxonomy
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)

        res = client_for(user).delete(f"/api/teacher/courses/{course.id}/")
        assert res.status_code == 200
        assert res.json()["pendingDeletion"] is True
        course.refresh_from_db()
        assert course.pending_deletion is True
        assert Course.objects.filter(id=course.id).exists()  # still there

    def test_admin_approves_deletion(self, taxonomy, db):
        category, subcategory = taxonomy
        _, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)
        course.pending_deletion = True
        course.save()
        admin = make_admin(ADMIN, "deladmin@test.dev")

        res = client_for(admin).post(f"/api/admin/courses/{course.id}/delete/")
        assert res.status_code == 200
        assert not Course.objects.filter(id=course.id).exists()

    def test_admin_aborts_deletion(self, taxonomy, db):
        category, subcategory = taxonomy
        _, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)
        course.pending_deletion = True
        course.save()
        admin = make_admin(ADMIN, "abortadmin@test.dev")

        res = client_for(admin).post(f"/api/admin/courses/{course.id}/abort-deletion/")
        assert res.status_code == 200
        course.refresh_from_db()
        assert course.pending_deletion is False
        assert Course.objects.filter(id=course.id).exists()


class TestApprovalHierarchy:
    def submit(self, user, course):
        client_for(user).post(f"/api/teacher/courses/{course.id}/publish/")
        course.refresh_from_db()

    def test_moderator_approval_publishes_when_single_approval(self, taxonomy, db):
        category, subcategory = taxonomy
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)
        self.submit(user, course)
        moderator = make_admin(MODERATOR, "mod@test.dev")

        res = client_for(moderator).post(f"/api/admin/courses/{course.id}/approve/")
        assert res.status_code == 200
        course.refresh_from_db()
        assert course.status == "published"

    def test_moderator_approval_waits_when_second_approval_required(self, taxonomy, db):
        category, subcategory = taxonomy
        PlatformSettings.objects.update_or_create(pk=1, defaults={"require_admin_second_approval": True})
        cache.clear()
        user, profile = make_teacher()
        course = make_full_course(profile, category, subcategory)
        self.submit(user, course)

        moderator = make_admin(MODERATOR, "mod2@test.dev")
        res = client_for(moderator).post(f"/api/admin/courses/{course.id}/approve/")
        assert res.status_code == 200
        course.refresh_from_db()
        assert course.status == "approved"
        assert course.visibility == "hidden"

        # An admin then publishes the approved course.
        admin = make_admin(SUPER_ADMIN, "super@test.dev")
        res = client_for(admin).post(f"/api/admin/courses/{course.id}/approve/")
        assert res.status_code == 200
        course.refresh_from_db()
        assert course.status == "published"
