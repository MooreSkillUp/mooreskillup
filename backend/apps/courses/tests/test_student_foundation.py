"""Phase 3 S0: reviews (eligibility + moderation), recommendations, notes, feature flags."""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, CourseReview, Lesson, Section
from apps.enrollments.models import Enrollment
from apps.platform.models import PlatformSettings
from apps.progress.models import CourseProgress
from common.rbac import MODERATOR


def make_student(email, track="React"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="Stu", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(
        user=user, selected_interest="Web", selected_track=track, selected_tracks=[track]
    )


def make_course(category, subcategory, title="Course", **extra):
    teacher_user = User.objects.create_user(
        email=f"t-{title}@t.dev", username=f"t{title}", display_name="T", password="pass12345", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
    defaults = dict(
        teacher=teacher, category=category, subcategory=subcategory, title=title,
        subtitle="s", overview="o", scheme_of_work="w", status="published", visibility="visible",
    )
    defaults.update(extra)
    course = Course.objects.create(**defaults)
    section = Section.objects.create(course=course, title="S", description="", order=1, is_published=True)
    Lesson.objects.create(section=section, title="L", content_type="text", text_content="hi", order=1)
    return course


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


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


class TestReviews:
    def test_cannot_review_without_enough_progress(self, taxonomy, db):
        category, subcategory = taxonomy
        course = make_course(category, subcategory)
        student = make_student("s1@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="free")
        # 0% progress → blocked
        res = client_for(student.user).post(
            f"/api/courses/{course.id}/reviews/", {"rating": 5, "comment": "great"}, format="json"
        )
        assert res.status_code == 403

    def test_can_review_after_half_progress(self, taxonomy, db):
        category, subcategory = taxonomy
        course = make_course(category, subcategory)
        student = make_student("s2@t.dev")
        enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")
        CourseProgress.objects.create(enrollment=enrollment, progress_percent=60, total_lessons_count=1, completed_lessons_count=1)
        res = client_for(student.user).post(
            f"/api/courses/{course.id}/reviews/", {"rating": 4, "comment": "solid"}, format="json"
        )
        assert res.status_code == 201
        assert CourseReview.objects.filter(course=course, student=student).count() == 1

        # Course detail now reflects the rating
        detail = APIClient().get(f"/api/courses/{course.id}/")
        assert detail.json()["reviewCount"] == 1
        assert detail.json()["averageRating"] == 4

    def test_reviews_disabled_blocks_posting(self, taxonomy, db):
        category, subcategory = taxonomy
        PlatformSettings.objects.update_or_create(pk=1, defaults={"feature_reviews_enabled": False})
        cache.clear()
        course = make_course(category, subcategory)
        student = make_student("s3@t.dev")
        enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")
        CourseProgress.objects.create(enrollment=enrollment, progress_percent=100, total_lessons_count=1, completed_lessons_count=1)
        res = client_for(student.user).post(
            f"/api/courses/{course.id}/reviews/", {"rating": 5}, format="json"
        )
        assert res.status_code == 403

    def test_moderator_can_hide_review(self, taxonomy, db):
        category, subcategory = taxonomy
        course = make_course(category, subcategory)
        student = make_student("s4@t.dev")
        review = CourseReview.objects.create(course=course, student=student, rating=1, comment="bad")
        moderator = User.objects.create_user(
            email="mod@t.dev", username="mod", display_name="M", password="pass12345",
            role="admin", admin_role=MODERATOR,
        )
        res = client_for(moderator).patch(f"/api/admin/reviews/{review.id}/", {"status": "hidden"}, format="json")
        assert res.status_code == 200
        review.refresh_from_db()
        assert review.status == "hidden"
        # Hidden reviews drop out of the public list
        public = APIClient().get(f"/api/courses/{course.id}/reviews/")
        assert public.json() == []


class TestRecommendations:
    def test_recommended_prioritizes_student_track(self, taxonomy, db):
        category, subcategory = taxonomy
        other_sub = Subcategory.objects.create(category=category, name="Vue")
        in_track = make_course(category, subcategory, title="React course")
        make_course(category, other_sub, title="Vue course")
        student = make_student("r1@t.dev", track="React")
        res = client_for(student.user).get("/api/courses/recommended/")
        assert res.status_code == 200
        titles = [c["title"] for c in res.json()]
        assert titles[0] == "React course"


class TestFeatureFlagsPublic:
    def test_status_exposes_feature_flags(self, db):
        res = APIClient().get("/api/platform/status/")
        assert res.status_code == 200
        features = res.json()["features"]
        assert features["reviews"] is True
        assert features["achievements"] is False  # coming soon by default
