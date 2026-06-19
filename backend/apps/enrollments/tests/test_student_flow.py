"""Phase 3 S1-S3: free enrollment, paid gating, lesson player access control."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.enrollments.models import Enrollment


def make_student(email):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="S", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")


def make_course(category, subcategory, price=0, title="Course"):
    teacher_user = User.objects.create_user(
        email=f"t-{title}@t.dev", username=f"t{title}", display_name="T", password="pass12345", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
    course = Course.objects.create(
        teacher=teacher, category=category, subcategory=subcategory, title=title, subtitle="s",
        overview="o", scheme_of_work="w", status="published", visibility="visible", price=price,
    )
    free_section = Section.objects.create(course=course, title="Free", description="", order=1, access_type="free", is_published=True)
    paid_section = Section.objects.create(course=course, title="Paid", description="", order=2, access_type="paid", is_published=True)
    free_lesson = Lesson.objects.create(section=free_section, title="Intro", content_type="text", text_content="hi", order=1, is_previewable=True)
    paid_lesson = Lesson.objects.create(section=paid_section, title="Deep", content_type="text", text_content="secret", order=1)
    return course, free_lesson, paid_lesson


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def taxonomy(db):
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return category, subcategory


class TestEnrollment:
    def test_free_enroll_creates_enrollment(self, taxonomy, db):
        category, subcategory = taxonomy
        course, _, _ = make_course(category, subcategory, price=0)
        student = make_student("f1@t.dev")
        res = client_for(student.user).post(f"/api/courses/{course.id}/enroll/")
        assert res.status_code == 201
        assert Enrollment.objects.filter(student=student, course=course).exists()

    def test_paid_enroll_requires_payment(self, taxonomy, db):
        category, subcategory = taxonomy
        course, _, _ = make_course(category, subcategory, price=10000)
        student = make_student("p1@t.dev")
        res = client_for(student.user).post(f"/api/courses/{course.id}/enroll/")
        assert res.status_code == 402
        assert not Enrollment.objects.filter(student=student, course=course).exists()

    def test_my_courses_includes_progress(self, taxonomy, db):
        category, subcategory = taxonomy
        course, _, _ = make_course(category, subcategory, price=0)
        student = make_student("m1@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="free")
        res = client_for(student.user).get("/api/my-courses/")
        assert res.status_code == 200
        assert res.json()[0]["progressPercent"] == 0.0


class TestLessonPlayerAccess:
    def test_paid_lesson_content_hidden_without_enrollment(self, taxonomy, db):
        category, subcategory = taxonomy
        course, free_lesson, paid_lesson = make_course(category, subcategory, price=10000)
        student = make_student("g1@t.dev")  # not enrolled

        # Free/previewable lesson is accessible
        res = client_for(student.user).get(f"/api/student/lessons/{free_lesson.id}/")
        assert res.json()["canAccess"] is True
        assert res.json()["lesson"]["textContent"] == "hi"

        # Paid lesson is locked, content withheld
        res = client_for(student.user).get(f"/api/student/lessons/{paid_lesson.id}/")
        assert res.json()["canAccess"] is False
        assert res.json()["lesson"]["textContent"] == ""

    def test_enrolled_student_unlocks_paid_lesson(self, taxonomy, db):
        category, subcategory = taxonomy
        course, _, paid_lesson = make_course(category, subcategory, price=10000)
        student = make_student("g2@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="payment")
        res = client_for(student.user).get(f"/api/student/lessons/{paid_lesson.id}/")
        assert res.json()["canAccess"] is True
        assert res.json()["lesson"]["textContent"] == "secret"


class TestCatalogFilters:
    def test_filter_by_price_and_search(self, taxonomy, db):
        category, subcategory = taxonomy
        make_course(category, subcategory, price=0, title="Free React")
        make_course(category, subcategory, price=5000, title="Paid React")
        client = APIClient()
        free = client.get("/api/courses/?price=free")
        titles = [c["title"] for c in free.json()["results"]]
        assert "Free React" in titles and "Paid React" not in titles

        search = client.get("/api/courses/?search=Paid")
        assert any("Paid" in c["title"] for c in search.json()["results"])
