"""What the admin Students page says, and what deleting a student is allowed to do.

- The list ran three extra queries per student (56 for fifteen).
- "Last active" ordered Enrollment.last_accessed_at descending, and Postgres puts
  empty values first, so one never-opened enrolment hid real activity.
- Payments, certificates and progress all cascade from a student's profile, so
  deleting a paying or certified student silently erased those records.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, User
from apps.categories.models import Category, Subcategory
from apps.certificates.models import Certificate
from apps.courses.models import Lesson, Section
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.progress.models import LessonProgress
from apps.progress.tests.test_teacher_analytics import make_course, make_student, make_teacher
from common.rbac import SUPER_ADMIN


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def world(db):
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    teacher, _ = make_teacher("owner@test.dev")
    course = make_course(teacher, category, subcategory, "Course A")
    other = make_course(teacher, category, subcategory, "Course B")
    for item in (course, other):
        section = Section.objects.create(course=item, title="S", description="d", order=1, is_published=True)
        Lesson.objects.create(section=section, title="L", content_type="text", order=1, is_published=True)
    admin = User.objects.create_user(
        email="ops@test.dev", username="ops", display_name="Ops",
        password="pass12345", role="admin", admin_role=SUPER_ADMIN,
    )
    client = APIClient()
    client.force_authenticate(user=admin)
    return {"client": client, "course": course, "other": other}


def row_for(client, student):
    rows = client.get("/api/admin/students/").json()
    return next(row for row in rows if row["id"] == str(student.id))


def study(student, course, when):
    enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")
    lesson = Lesson.objects.get(section__course=course)
    LessonProgress.objects.create(enrollment=enrollment, lesson=lesson, status="in_progress", last_accessed_at=when)
    return enrollment


def test_last_studied_is_not_hidden_by_an_enrolment_never_opened(world):
    student = make_student("busy@test.dev")
    studied_at = timezone.now() - timedelta(days=1)
    study(student, world["course"], studied_at)
    # A second enrolment, never opened: its last_accessed_at is empty.
    Enrollment.objects.create(student=student, course=world["other"], access_source="free")

    row = row_for(world["client"], student)
    assert parse_datetime(row["lastActiveAt"]) == studied_at
    assert row["enrolledCourses"] == 2


def test_the_list_costs_the_same_however_many_students(world):
    def queries():
        with CaptureQueriesContext(connection) as ctx:
            assert world["client"].get("/api/admin/students/").status_code == 200
        return len([
            q for q in ctx.captured_queries
            if "platform_platformsettings" not in q["sql"]
            and "SAVEPOINT" not in q["sql"]
            and "django_cache_table" not in q["sql"]
        ])

    study(make_student("first@test.dev"), world["course"], timezone.now())
    baseline = queries()
    for index in range(4):
        student = make_student(f"more{index}@test.dev")
        study(student, world["course"], timezone.now())
        Payment.objects.create(
            student=student, course=world["other"], amount=Decimal("1000"),
            payment_method="paystack", status="successful", description="Course B",
        )

    assert queries() == baseline


def test_a_student_with_payments_cannot_be_deleted(world):
    student = make_student("payer@test.dev")
    Payment.objects.create(
        student=student, course=world["course"], amount=Decimal("5000"),
        payment_method="paystack", status="successful", description="Course A",
    )

    response = world["client"].delete(f"/api/admin/students/{student.id}/")
    assert response.status_code == 409
    assert "Suspend" in response.json()["detail"]
    assert StudentProfile.objects.filter(id=student.id).exists()
    assert Payment.objects.filter(student=student).count() == 1


def test_a_student_with_a_certificate_cannot_be_deleted(world):
    student = make_student("certified@test.dev")
    enrollment = Enrollment.objects.create(
        student=student, course=world["course"], access_source="free", status="completed"
    )
    Certificate.objects.create(
        student=student, course=world["course"], enrollment=enrollment,
        certificate_code="MSU-TEST0001", verification_url="https://example.test/verify/MSU-TEST0001",
    )

    response = world["client"].delete(f"/api/admin/students/{student.id}/")
    assert response.status_code == 409
    assert Certificate.objects.filter(certificate_code="MSU-TEST0001").exists()


def test_a_student_with_no_records_can_still_be_deleted(world):
    student = make_student("gone@test.dev")
    user_id = student.user_id

    response = world["client"].delete(f"/api/admin/students/{student.id}/")
    assert response.status_code in (200, 204)
    assert not User.objects.filter(id=user_id).exists()


def test_the_list_reports_the_last_sign_in(world):
    student = make_student("signed@test.dev")
    signed_in = timezone.now() - timedelta(hours=3)
    User.objects.filter(id=student.user_id).update(last_login=signed_in)

    row = row_for(world["client"], student)
    assert parse_datetime(row["lastSignedInAt"]) == signed_in
