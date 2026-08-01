from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Section, Task
from apps.enrollments.models import Enrollment
from apps.schedule.models import Event
from apps.schedule.views import upcoming_for_student

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def taxonomy():
    category = Category.objects.create(name="Web Development")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return category, subcategory


def make_teacher(email, taxonomy):
    category, _ = taxonomy
    user = User.objects.create_user(
        username=email.split("@")[0], email=email, display_name="Teacher", password="pw12345!", role="teacher"
    )
    return TeacherProfile.objects.create(user=user, program=category.name, track="React")


def make_student(email):
    user = User.objects.create_user(
        username=email.split("@")[0], email=email, display_name="Student", password="pw12345!", role="student"
    )
    return StudentProfile.objects.create(user=user)


def make_admin(email):
    user = User.objects.create_user(
        username=email.split("@")[0], email=email, display_name="Admin", password="pw12345!", role="admin"
    )
    user.admin_role = "super_admin"
    user.save(update_fields=["admin_role"])
    return user


def make_course(teacher, taxonomy, title="React course"):
    category, subcategory = taxonomy
    return Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title=title,
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        status="published",
    )


class TestStudentVisibility:
    def test_student_sees_events_for_enrolled_courses(self, taxonomy):
        teacher = make_teacher("t1@t.dev", taxonomy)
        course = make_course(teacher, taxonomy)
        student = make_student("s1@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="free")

        Event.objects.create(
            title="Live class", starts_at=timezone.now() + timedelta(days=1), course=course
        )

        res = client_for(student.user).get("/api/student/upcoming/")
        assert res.status_code == 200
        assert [item["title"] for item in res.json()] == ["Live class"]

    def test_student_does_not_see_events_for_other_courses(self, taxonomy):
        teacher = make_teacher("t2@t.dev", taxonomy)
        enrolled = make_course(teacher, taxonomy, title="Mine")
        other = make_course(teacher, taxonomy, title="Theirs")
        student = make_student("s2@t.dev")
        Enrollment.objects.create(student=student, course=enrolled, access_source="free")

        Event.objects.create(
            title="Not for me", starts_at=timezone.now() + timedelta(days=1), course=other
        )

        res = client_for(student.user).get("/api/student/upcoming/")
        assert res.json() == []

    def test_platform_wide_events_reach_everyone(self, taxonomy):
        student = make_student("s3@t.dev")
        Event.objects.create(title="Platform launch", starts_at=timezone.now() + timedelta(days=2))

        res = client_for(student.user).get("/api/student/upcoming/")
        assert [item["title"] for item in res.json()] == ["Platform launch"]

    def test_drafts_and_cancellations_and_past_events_are_hidden(self, taxonomy):
        student = make_student("s4@t.dev")
        soon = timezone.now() + timedelta(days=1)
        Event.objects.create(title="Draft", starts_at=soon, is_published=False)
        Event.objects.create(title="Cancelled", starts_at=soon, is_cancelled=True)
        Event.objects.create(title="Past", starts_at=timezone.now() - timedelta(days=1))

        res = client_for(student.user).get("/api/student/upcoming/")
        assert res.json() == []

    def test_assignments_and_events_merge_in_time_order(self, taxonomy):
        teacher = make_teacher("t3@t.dev", taxonomy)
        course = make_course(teacher, taxonomy)
        student = make_student("s5@t.dev")
        Enrollment.objects.create(student=student, course=course, access_source="free")
        section = Section.objects.create(course=course, title="Week 1", order=1, is_published=True)

        Task.objects.create(
            section=section,
            title="Assignment due later",
            instructions="do it",
            submission_type="google_form",
            due_date=(timezone.localtime() + timedelta(days=5)).date(),
        )
        Event.objects.create(
            title="Class sooner", starts_at=timezone.now() + timedelta(days=1), course=course
        )

        items = upcoming_for_student(student, limit=10)
        assert [item["title"] for item in items] == ["Class sooner", "Assignment due later"]
        assert [item["type"] for item in items] == ["event", "assignment"]


class TestTeacherOwnership:
    def test_teacher_can_schedule_for_own_course(self, taxonomy):
        teacher = make_teacher("t4@t.dev", taxonomy)
        course = make_course(teacher, taxonomy)

        res = client_for(teacher.user).post(
            "/api/teacher/events/",
            {
                "title": "My class",
                "kind": "live_class",
                "startsAt": (timezone.now() + timedelta(days=1)).isoformat(),
                "course": str(course.id),
            },
            format="json",
        )
        assert res.status_code == 201
        assert Event.objects.get().created_by == teacher.user

    def test_teacher_cannot_schedule_for_someone_elses_course(self, taxonomy):
        owner = make_teacher("owner@t.dev", taxonomy)
        intruder = make_teacher("intruder@t.dev", taxonomy)
        course = make_course(owner, taxonomy)

        res = client_for(intruder.user).post(
            "/api/teacher/events/",
            {
                "title": "Hijack",
                "startsAt": (timezone.now() + timedelta(days=1)).isoformat(),
                "course": str(course.id),
            },
            format="json",
        )
        assert res.status_code == 400
        assert not Event.objects.exists()

    def test_teacher_cannot_schedule_platform_wide(self, taxonomy):
        teacher = make_teacher("t5@t.dev", taxonomy)

        res = client_for(teacher.user).post(
            "/api/teacher/events/",
            {"title": "Everyone", "startsAt": (timezone.now() + timedelta(days=1)).isoformat()},
            format="json",
        )
        assert res.status_code == 400
        assert not Event.objects.exists()

    def test_teacher_list_only_shows_own_events(self, taxonomy):
        owner = make_teacher("o2@t.dev", taxonomy)
        other = make_teacher("o3@t.dev", taxonomy)
        Event.objects.create(
            title="Mine",
            starts_at=timezone.now() + timedelta(days=1),
            course=make_course(owner, taxonomy, title="Owner course"),
        )
        Event.objects.create(
            title="Theirs",
            starts_at=timezone.now() + timedelta(days=1),
            course=make_course(other, taxonomy, title="Other course"),
        )

        res = client_for(owner.user).get("/api/teacher/events/")
        # ListCreateAPIView uses the project's default page-number pagination.
        titles = [item["title"] for item in res.json()["results"]]
        assert titles == ["Mine"]

    def test_teacher_cannot_edit_another_teachers_event(self, taxonomy):
        owner = make_teacher("o4@t.dev", taxonomy)
        intruder = make_teacher("i2@t.dev", taxonomy)
        event = Event.objects.create(
            title="Owned",
            starts_at=timezone.now() + timedelta(days=1),
            course=make_course(owner, taxonomy),
        )

        res = client_for(intruder.user).patch(
            f"/api/teacher/events/{event.id}/", {"title": "Stolen"}, format="json"
        )
        assert res.status_code == 404
        event.refresh_from_db()
        assert event.title == "Owned"


class TestAdmin:
    def test_admin_can_schedule_platform_wide(self, taxonomy):
        admin = make_admin("a1@t.dev")

        res = client_for(admin).post(
            "/api/admin/events/",
            {"title": "Everyone", "startsAt": (timezone.now() + timedelta(days=1)).isoformat()},
            format="json",
        )
        assert res.status_code == 201
        assert Event.objects.get().is_platform_wide

    def test_admin_can_schedule_for_any_course(self, taxonomy):
        admin = make_admin("a2@t.dev")
        teacher = make_teacher("t6@t.dev", taxonomy)
        course = make_course(teacher, taxonomy)

        res = client_for(admin).post(
            "/api/admin/events/",
            {
                "title": "Admin session",
                "startsAt": (timezone.now() + timedelta(days=1)).isoformat(),
                "course": str(course.id),
            },
            format="json",
        )
        assert res.status_code == 201

    def test_students_cannot_reach_admin_endpoints(self, taxonomy):
        student = make_student("s6@t.dev")
        res = client_for(student.user).get("/api/admin/events/")
        assert res.status_code == 403


class TestValidation:
    def test_end_must_be_after_start(self, taxonomy):
        admin = make_admin("a3@t.dev")
        start = timezone.now() + timedelta(days=1)

        res = client_for(admin).post(
            "/api/admin/events/",
            {
                "title": "Backwards",
                "startsAt": start.isoformat(),
                "endsAt": (start - timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        assert res.status_code == 400
        assert "endsAt" in res.json()
