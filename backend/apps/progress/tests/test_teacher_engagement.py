"""What "engaged learners" is allowed to mean on a teacher's dashboard.

The screen showed "20% overall completion rate" beside "0 engaged learners".
Both came from the same set of enrolments, so they could not both be true: a
completed enrolment is one where lessons were plainly opened.

Two causes, and a test for each. The count read `Enrollment.last_accessed_at`
— a copy of a fact that LessonProgress already holds — and it counted enrolment
rows under a label that says people.
"""

import pytest
from django.utils import timezone

from apps.courses.models import Lesson, Section
from apps.enrollments.models import Enrollment
from apps.progress.models import LessonProgress
from apps.progress.views import build_teacher_analytics

from .test_teacher_analytics import client_for, make_course, make_student, make_teacher


@pytest.fixture
def taxonomy(db):
    from apps.categories.models import Category, Subcategory

    category = Category.objects.create(name="Web", slug="web")
    subcategory = Subcategory.objects.create(category=category, name="React", slug="react")
    return category, subcategory


def add_lesson(course, title="Lesson 1"):
    section = course.sections.first() or Section.objects.create(
        course=course, title="Section 1", order=0, is_published=True
    )
    return Lesson.objects.create(
        section=section, title=title, order=section.lessons.count(), is_published=True
    )


def test_a_completed_enrolment_is_never_reported_as_unengaged(taxonomy, db):
    """The exact contradiction the dashboard showed.

    `last_accessed_at` is left null here on purpose — it is a denormalised copy
    written by the lesson-ping endpoint, and anything that writes progress by
    another route (the demo seeder did) leaves it behind. The LessonProgress row
    is the evidence, so that is what the count has to ask.
    """
    category, subcategory = taxonomy
    teacher, user = make_teacher("engaged@t.dev")
    course = make_course(teacher, category, subcategory, "Course")
    lesson = add_lesson(course)
    student = make_student("learner@t.dev")

    enrollment = Enrollment.objects.create(
        student=student, course=course, access_source="free", status="completed"
    )
    LessonProgress.objects.create(
        enrollment=enrollment,
        lesson=lesson,
        status="completed",
        first_accessed_at=timezone.now(),
        last_accessed_at=timezone.now(),
    )
    assert enrollment.last_accessed_at is None

    totals = client_for(user).get("/api/teacher/analytics/").json()["totals"]
    assert totals["completionRate"] == 100.0
    assert totals["engagedLearners"] == 1, "a completed course means lessons were opened"
    assert totals["activeLearners"] == 1


def test_engaged_learners_counts_people_not_enrollments(taxonomy, db):
    """One student across three courses is one learner, not three."""
    category, subcategory = taxonomy
    teacher, user = make_teacher("people@t.dev")
    student = make_student("busy@t.dev")

    for index in range(3):
        course = make_course(teacher, category, subcategory, f"Course {index}")
        lesson = add_lesson(course)
        enrollment = Enrollment.objects.create(
            student=student, course=course, access_source="free", status="active"
        )
        LessonProgress.objects.create(
            enrollment=enrollment,
            lesson=lesson,
            status="in_progress",
            first_accessed_at=timezone.now(),
            last_accessed_at=timezone.now(),
        )

    totals = build_teacher_analytics(teacher)["totals"]
    assert totals["totalEnrollments"] == 3
    assert totals["engagedLearners"] == 1

    # Per course the unit genuinely is the enrolment, so each reads 1.
    assert [row["engaged"] for row in build_teacher_analytics(teacher)["courses"]] == [1, 1, 1]


def test_an_enrolment_with_no_lesson_opened_is_not_engaged(taxonomy, db):
    """Enrolling is not engaging — the number has to be able to say zero."""
    category, subcategory = taxonomy
    teacher, _ = make_teacher("quiet@t.dev")
    course = make_course(teacher, category, subcategory, "Course")
    add_lesson(course)
    Enrollment.objects.create(
        student=make_student("lurker@t.dev"), course=course, access_source="free", status="active"
    )

    totals = build_teacher_analytics(teacher)["totals"]
    assert totals["totalEnrollments"] == 1
    assert totals["engagedLearners"] == 0
    assert totals["activeLearners"] == 0


def test_the_students_table_reports_when_a_lesson_was_last_opened(taxonomy, db):
    """`lastActiveAt` comes from the same evidence, not from a second field."""
    from apps.progress.views import build_teacher_students

    category, subcategory = taxonomy
    teacher, _ = make_teacher("table@t.dev")
    course = make_course(teacher, category, subcategory, "Course")
    lesson = add_lesson(course)
    enrollment = Enrollment.objects.create(
        student=make_student("row@t.dev"), course=course, access_source="free", status="active"
    )
    opened = timezone.now()
    LessonProgress.objects.create(
        enrollment=enrollment, lesson=lesson, status="in_progress", last_accessed_at=opened
    )

    row = build_teacher_students(teacher)[0]
    assert row["isActive"] is True
    assert row["lastActiveAt"] == opened.isoformat()


def test_a_finished_lesson_with_no_access_time_still_counts_as_activity(taxonomy, db):
    """"100% complete, last active: Never" is not a sentence we can show.

    A LessonProgress row can carry a completion time and no access time — any
    path that marks a lesson done without going through the lesson-ping
    endpoint leaves it that way. Completion is activity, so the recency
    annotation falls back to it.
    """
    from apps.progress.views import build_teacher_students

    category, subcategory = taxonomy
    teacher, _ = make_teacher("finished@t.dev")
    course = make_course(teacher, category, subcategory, "Course")
    lesson = add_lesson(course)
    enrollment = Enrollment.objects.create(
        student=make_student("done@t.dev"), course=course, access_source="free", status="completed"
    )
    finished = timezone.now()
    LessonProgress.objects.create(
        enrollment=enrollment,
        lesson=lesson,
        status="completed",
        first_accessed_at=None,
        last_accessed_at=None,
        completed_at=finished,
    )

    row = build_teacher_students(teacher)[0]
    assert row["lastActiveAt"] == finished.isoformat()
    assert row["isActive"] is True
