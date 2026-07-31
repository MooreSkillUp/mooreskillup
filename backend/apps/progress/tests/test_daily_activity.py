"""Real learning activity: recording it, and the numbers derived from it.

Before this, LessonProgress.time_spent_seconds was never written and the
dashboard invented its figures. These tests exist so it stays real.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section, Task
from apps.enrollments.models import Enrollment
from apps.progress.activity import (
    MAX_SECONDS_PER_PING,
    current_streak,
    minutes_today,
    record_learning_time,
    total_learning_minutes,
    week_activity,
)
from apps.progress.models import DailyActivity, LessonProgress
from apps.progress.views import build_upcoming_work


@pytest.fixture
def student(db):
    user = User.objects.create_user(
        email="s@test.dev", username="s", display_name="Sam Student", password="password123", role="student"
    )
    return StudentProfile.objects.create(user=user)


@pytest.fixture
def lesson(db):
    teacher_user = User.objects.create_user(
        email="t@test.dev", username="t", display_name="Tess Teacher", password="password123", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
    category = Category.objects.create(name="Web Development")
    subcategory = Subcategory.objects.create(category=category, name="Frontend")
    course = Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title="React",
        subtitle="Learn React",
        overview="A course.",
        scheme_of_work="Weekly.",
        status="published",
    )
    section = Section.objects.create(course=course, title="Week 1", order=1, is_published=True)
    return Lesson.objects.create(
        section=section, title="Intro", content_type="text", order=1, is_published=True
    )


def enrol(student, lesson):
    return Enrollment.objects.create(
        student=student, course=lesson.section.course, access_source="free"
    )


class TestRecordingTime:
    def test_first_ping_banks_nothing(self, db, student, lesson):
        """There is no earlier ping to measure a gap from."""
        enrollment = enrol(student, lesson)
        progress = LessonProgress.objects.create(enrollment=enrollment, lesson=lesson)
        assert record_learning_time(progress) == 0

    def test_a_gap_between_pings_is_banked(self, db, student, lesson):
        enrollment = enrol(student, lesson)
        progress = LessonProgress.objects.create(
            enrollment=enrollment, lesson=lesson, last_accessed_at=timezone.now() - timedelta(seconds=45)
        )
        credited = record_learning_time(progress)
        assert credited == pytest.approx(45, abs=2)
        assert progress.time_spent_seconds == pytest.approx(45, abs=2)

    def test_an_idle_tab_cannot_claim_hours(self, db, student, lesson):
        """A laptop lid closed overnight is not eight hours of study."""
        enrollment = enrol(student, lesson)
        progress = LessonProgress.objects.create(
            enrollment=enrollment, lesson=lesson, last_accessed_at=timezone.now() - timedelta(hours=8)
        )
        assert record_learning_time(progress) == MAX_SECONDS_PER_PING

    def test_time_accumulates_across_pings(self, db, student, lesson):
        enrollment = enrol(student, lesson)
        progress = LessonProgress.objects.create(
            enrollment=enrollment, lesson=lesson, last_accessed_at=timezone.now() - timedelta(seconds=30)
        )
        record_learning_time(progress)
        progress.last_accessed_at = timezone.now() - timedelta(seconds=30)
        record_learning_time(progress)
        assert progress.time_spent_seconds == pytest.approx(60, abs=3)


class TestStreak:
    def test_no_activity_is_no_streak(self, db, student):
        assert current_streak(student) == 0

    def test_consecutive_days_count(self, db, student):
        today = timezone.localtime().date()
        for offset in range(3):
            DailyActivity.objects.create(student=student, date=today - timedelta(days=offset), minutes=10)
        assert current_streak(student) == 3

    def test_a_gap_breaks_the_streak(self, db, student):
        today = timezone.localtime().date()
        DailyActivity.objects.create(student=student, date=today, minutes=10)
        DailyActivity.objects.create(student=student, date=today - timedelta(days=2), minutes=10)
        assert current_streak(student) == 1

    def test_yesterday_still_counts(self, db, student):
        """So the streak doesn't look broken first thing in the morning."""
        today = timezone.localtime().date()
        DailyActivity.objects.create(student=student, date=today - timedelta(days=1), minutes=10)
        DailyActivity.objects.create(student=student, date=today - timedelta(days=2), minutes=10)
        assert current_streak(student) == 2

    def test_a_day_with_no_minutes_does_not_count(self, db, student):
        today = timezone.localtime().date()
        DailyActivity.objects.create(student=student, date=today, minutes=0)
        assert current_streak(student) == 0

    def test_stale_activity_gives_no_streak(self, db, student):
        today = timezone.localtime().date()
        DailyActivity.objects.create(student=student, date=today - timedelta(days=5), minutes=30)
        assert current_streak(student) == 0


class TestWeekAndTotals:
    def test_week_always_returns_seven_days_oldest_first(self, db, student):
        week = week_activity(student)
        assert len(week) == 7
        assert week[-1]["isToday"] is True
        assert all(day["minutes"] == 0 for day in week)

    def test_totals_come_from_recorded_time(self, db, student, lesson):
        enrollment = enrol(student, lesson)
        LessonProgress.objects.create(enrollment=enrollment, lesson=lesson, time_spent_seconds=605)
        assert total_learning_minutes(student) == 10

    def test_minutes_today_is_zero_before_any_activity(self, db, student):
        assert minutes_today(student) == 0


class TestUpcomingWork:
    def test_only_shows_assignments_from_enrolled_courses(self, db, student, lesson):
        section = lesson.section
        Task.objects.create(
            section=section,
            title="Build a layout",
            instructions="Do it",
            submission_type="google_form",
            due_date=timezone.localtime().date() + timedelta(days=3),
            order=1,
        )
        # Not enrolled yet — nothing should surface.
        assert build_upcoming_work(student) == []

        enrol(student, lesson)
        rows = build_upcoming_work(student)
        assert len(rows) == 1
        assert rows[0]["title"] == "Build a layout"
        assert rows[0]["daysUntilDue"] == 3

    def test_past_due_dates_are_left_out(self, db, student, lesson):
        enrol(student, lesson)
        Task.objects.create(
            section=lesson.section,
            title="Old work",
            instructions="Do it",
            submission_type="google_form",
            due_date=timezone.localtime().date() - timedelta(days=1),
            order=1,
        )
        assert build_upcoming_work(student) == []

    def test_assignments_without_a_due_date_are_left_out(self, db, student, lesson):
        enrol(student, lesson)
        Task.objects.create(
            section=lesson.section,
            title="Whenever",
            instructions="Do it",
            submission_type="google_form",
            order=1,
        )
        assert build_upcoming_work(student) == []


class TestDashboardPayload:
    def test_a_new_student_sees_honest_zeros(self, db, student):
        client = APIClient()
        client.force_authenticate(user=student.user)
        res = client.get("/api/dashboard/student/")

        assert res.status_code == 200
        activity = res.json()["activity"]
        assert activity["streakDays"] == 0
        assert activity["minutesToday"] == 0
        assert activity["totalMinutes"] == 0
        assert activity["dailyGoalMinutes"] == 30
        assert len(activity["week"]) == 7
        assert res.json()["upcoming"] == []

    def test_studying_moves_the_numbers(self, db, student, lesson):
        enrol(student, lesson)
        client = APIClient()
        client.force_authenticate(user=student.user)

        # First ping opens the lesson, second banks the gap between them.
        client.post(f"/api/progress/lessons/{lesson.id}/", {"status": "in_progress"}, format="json")
        progress = LessonProgress.objects.get(lesson=lesson)
        progress.last_accessed_at = timezone.now() - timedelta(seconds=90)
        progress.save(update_fields=["last_accessed_at"])
        client.post(f"/api/progress/lessons/{lesson.id}/", {"status": "in_progress"}, format="json")

        activity = client.get("/api/dashboard/student/").json()["activity"]
        assert activity["minutesToday"] >= 1
        assert activity["streakDays"] == 1
