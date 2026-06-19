"""Phase 2 T4: teacher analytics must be scoped to the teacher's own courses only."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.enrollments.models import Enrollment


def make_teacher(email):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="T", password="pass12345", role="teacher"
    )
    return TeacherProfile.objects.create(user=user, program="Web", track="React"), user


def make_student(email):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="S", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")


def make_course(teacher, category, subcategory, title):
    return Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title=title,
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        status="published",
        visibility="visible",
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


def test_analytics_only_counts_own_courses(taxonomy, db):
    category, subcategory = taxonomy
    teacher_a, user_a = make_teacher("a@t.dev")
    teacher_b, _ = make_teacher("b@t.dev")

    course_a = make_course(teacher_a, category, subcategory, "A course")
    course_b = make_course(teacher_b, category, subcategory, "B course")

    student1 = make_student("s1@t.dev")
    student2 = make_student("s2@t.dev")
    # 2 enrollments on A's course, 1 on B's course
    Enrollment.objects.create(student=student1, course=course_a, access_source="free")
    Enrollment.objects.create(student=student2, course=course_a, access_source="free")
    Enrollment.objects.create(student=student1, course=course_b, access_source="free")

    res = client_for(user_a).get("/api/teacher/analytics/")
    assert res.status_code == 200
    data = res.json()
    # Teacher A only sees their own course and its 2 enrollments — not B's.
    assert data["totals"]["totalCourses"] == 1
    assert data["totals"]["totalEnrollments"] == 2
    assert len(data["courses"]) == 1
    assert data["courses"][0]["title"] == "A course"
    assert data["courses"][0]["enrollments"] == 2


def test_completion_rate_and_export(taxonomy, db):
    category, subcategory = taxonomy
    teacher, user = make_teacher("c@t.dev")
    course = make_course(teacher, category, subcategory, "Course")
    s1 = make_student("x1@t.dev")
    s2 = make_student("x2@t.dev")
    Enrollment.objects.create(student=s1, course=course, access_source="free", status="completed")
    Enrollment.objects.create(student=s2, course=course, access_source="free", status="active")

    res = client_for(user).get("/api/teacher/analytics/")
    assert res.json()["totals"]["completionRate"] == 50.0

    export = client_for(user).get("/api/teacher/analytics/export/")
    assert export.status_code == 200
    assert export["Content-Type"] == "text/csv"
    assert b"Course" in export.content


def test_students_cannot_access_teacher_analytics(taxonomy, db):
    student = make_student("blocked@t.dev")
    assert client_for(student.user).get("/api/teacher/analytics/").status_code == 403


def test_student_list_scoped_to_own_courses(taxonomy, db):
    category, subcategory = taxonomy
    teacher_a, user_a = make_teacher("sa@t.dev")
    teacher_b, _ = make_teacher("sb@t.dev")
    course_a = make_course(teacher_a, category, subcategory, "A")
    course_b = make_course(teacher_b, category, subcategory, "B")
    s1 = make_student("p1@t.dev")
    s2 = make_student("p2@t.dev")
    Enrollment.objects.create(student=s1, course=course_a, access_source="free")
    Enrollment.objects.create(student=s2, course=course_b, access_source="free")

    res = client_for(user_a).get("/api/teacher/students/")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["totalEnrolled"] == 1
    assert data["students"][0]["email"] == "p1@t.dev"
    assert data["students"][0]["courseTitle"] == "A"
