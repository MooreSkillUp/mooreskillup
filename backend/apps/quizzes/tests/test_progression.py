"""The rules that decide what a student can reach and when they have finished.

These are the rules most likely to strand somebody, so each one is pinned:
a course that gates when it shouldn't is a support ticket, and one that fails to
gate makes the certificate meaningless.
"""

import pytest
from django.utils import timezone

from apps.accounts.models import StudentProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.enrollments.models import Enrollment
from apps.progress.models import LessonProgress
from apps.quizzes.models import Choice, Question, Quiz, QuizAttempt, cooldown_remaining_seconds
from apps.quizzes.progression import (
    accessible_section_ids,
    certificate_is_earned,
    course_sections_complete,
    section_is_complete,
)


@pytest.fixture
def course_with_sections(db):
    """A sequential course, three sections, two lessons each."""
    user = User.objects.create_user(
        email="s@test.dev", username="s", display_name="S", password="password123"
    )
    student = StudentProfile.objects.create(user=user)
    category = Category.objects.create(name="Cat")
    subcategory = Subcategory.objects.create(category=category, name="Sub")
    course = Course.objects.create(
        category=category,
        subcategory=subcategory,
        title="Course",
        status="published",
        progression_mode="sequential",
    )
    sections = []
    for index in range(3):
        section = Section.objects.create(
            course=course, title=f"S{index}", description="", order=index
        )
        for lesson_index in range(2):
            Lesson.objects.create(
                section=section, title=f"L{lesson_index}", content_type="text", order=lesson_index
            )
        sections.append(section)

    enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")
    return {"student": student, "course": course, "sections": sections, "enrollment": enrollment}


def complete_lessons(enrollment, section):
    for lesson in Lesson.objects.filter(section=section):
        LessonProgress.objects.update_or_create(
            enrollment=enrollment, lesson=lesson, defaults={"status": "completed"}
        )


def build_quiz(course, section=None, *, kind="section", published=True, with_question=True):
    quiz = Quiz.objects.create(
        course=course, section=section, kind=kind, title="Quiz", is_published=published
    )
    if with_question:
        question = Question.objects.create(quiz=quiz, text="2 + 2?")
        Choice.objects.create(question=question, text="4", is_correct=True)
        Choice.objects.create(question=question, text="5", is_correct=False)
    return quiz


def test_open_courses_never_gate(course_with_sections):
    """The default mode must reach every section — nothing gates by accident."""
    data = course_with_sections
    data["course"].progression_mode = "open"
    data["course"].save(update_fields=["progression_mode"])

    assert len(accessible_section_ids(data["enrollment"])) == 3


def test_sequential_opens_one_section_at_a_time(course_with_sections):
    data = course_with_sections
    sections, enrollment = data["sections"], data["enrollment"]

    # Nothing done: only the first section is open.
    assert accessible_section_ids(enrollment) == {sections[0].id}

    complete_lessons(enrollment, sections[0])
    assert accessible_section_ids(enrollment) == {sections[0].id, sections[1].id}

    complete_lessons(enrollment, sections[1])
    assert len(accessible_section_ids(enrollment)) == 3


def test_a_section_without_a_quiz_completes_on_its_lessons(course_with_sections):
    """No quiz means no gate. This is what stops students getting stuck."""
    data = course_with_sections
    complete_lessons(data["enrollment"], data["sections"][0])
    assert section_is_complete(data["enrollment"], data["sections"][0]) is True


def test_a_section_quiz_must_be_passed_to_move_on(course_with_sections):
    data = course_with_sections
    quiz = build_quiz(data["course"], data["sections"][0])
    complete_lessons(data["enrollment"], data["sections"][0])

    # Lessons done but quiz unpassed — the next section stays shut.
    assert section_is_complete(data["enrollment"], data["sections"][0]) is False
    assert accessible_section_ids(data["enrollment"]) == {data["sections"][0].id}

    QuizAttempt.objects.create(
        quiz=quiz, student=data["student"], passed=True, submitted_at=timezone.now()
    )
    assert section_is_complete(data["enrollment"], data["sections"][0]) is True
    assert data["sections"][1].id in accessible_section_ids(data["enrollment"])


def test_an_unready_quiz_does_not_lock_anyone_out(course_with_sections):
    """A published quiz with no questions must not become a locked door.

    Teachers publish drafts by accident. The cost of ignoring an empty quiz is a
    section that opens early; the cost of honouring it is a student who cannot
    continue and has nobody to ask.
    """
    data = course_with_sections
    build_quiz(data["course"], data["sections"][0], with_question=False)
    complete_lessons(data["enrollment"], data["sections"][0])

    assert section_is_complete(data["enrollment"], data["sections"][0]) is True


def test_switching_to_sequential_does_not_lock_out_existing_students(course_with_sections):
    """Someone already deep in a course keeps what they had reached."""
    data = course_with_sections
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)

    assert len(accessible_section_ids(data["enrollment"])) == 3


def test_certificate_needs_the_final_assessment_when_there_is_one(course_with_sections):
    data = course_with_sections
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)

    assert course_sections_complete(data["enrollment"]) is True
    # No final assessment: finishing the sections is enough.
    assert certificate_is_earned(data["enrollment"]) is True

    final = build_quiz(data["course"], None, kind="final")
    # Now it is not, until the final is passed.
    assert certificate_is_earned(data["enrollment"]) is False

    QuizAttempt.objects.create(
        quiz=final, student=data["student"], passed=True, submitted_at=timezone.now()
    )
    assert certificate_is_earned(data["enrollment"]) is True


def test_cooldown_applies_after_a_failure_but_not_after_a_pass(course_with_sections):
    data = course_with_sections
    quiz = build_quiz(data["course"], data["sections"][0])

    # Never attempted — start whenever.
    assert cooldown_remaining_seconds(data["student"], quiz) == 0

    QuizAttempt.objects.create(
        quiz=quiz, student=data["student"], passed=False, submitted_at=timezone.now()
    )
    assert cooldown_remaining_seconds(data["student"], quiz) > 0

    # Passing clears it — nobody waits to retake something they got right.
    QuizAttempt.objects.create(
        quiz=quiz, student=data["student"], passed=True, submitted_at=timezone.now()
    )
    assert cooldown_remaining_seconds(data["student"], quiz) == 0


class TestMaterialAlreadyCovered:
    """A quiz added to a live course must not shut students out of work they did.

    `accessible_section_ids` said in its own docstring that sections a student
    has already completed "stay open regardless", and then stopped at the first
    unfinished section anyway. A teacher adding a section quiz to a running
    course re-locked every later section for students who had finished the
    lessons months ago — including students the platform already called
    "completed".
    """

    def test_finished_sections_stay_open_when_a_quiz_appears_later(self, course_with_sections):
        enrollment = course_with_sections["enrollment"]
        sections = course_with_sections["sections"]
        for section in sections:
            complete_lessons(enrollment, section)

        # The teacher adds a quiz to section 1 after the fact.
        build_quiz(course_with_sections["course"], section=sections[0])

        open_ids = accessible_section_ids(enrollment)

        assert sections[0].id in open_ids
        assert sections[1].id in open_ids, "a section whose lessons are all done was locked"
        assert sections[2].id in open_ids

    def test_a_student_midway_is_still_gated(self, course_with_sections):
        """The gate itself stays: only what they have actually finished opens."""
        enrollment = course_with_sections["enrollment"]
        sections = course_with_sections["sections"]
        complete_lessons(enrollment, sections[0])
        build_quiz(course_with_sections["course"], section=sections[0])

        open_ids = accessible_section_ids(enrollment)

        assert sections[0].id in open_ids
        assert sections[1].id not in open_ids
        assert sections[2].id not in open_ids


# --- What is still outstanding, and what the progress number means -----------
#
# A student finished every lesson of a course whose certificate also needs a
# final assessment. The screen said 100%, the certificate stayed locked, and
# nothing anywhere said why — because progress counted lessons only, and no
# screen linked to the final. These pin both halves.


def test_progress_is_not_complete_while_the_final_assessment_is_outstanding(course_with_sections):
    from apps.progress.views import refresh_course_progress

    data = course_with_sections
    build_quiz(data["course"], kind="final")
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)

    progress = refresh_course_progress(data["enrollment"])

    assert progress.is_completed is False
    # Every lesson is done, so a lesson-only count reads 100. It must not.
    assert progress.progress_percent < 100


def test_progress_reaches_100_once_the_final_is_passed(course_with_sections):
    from apps.progress.views import refresh_course_progress

    data = course_with_sections
    final = build_quiz(data["course"], kind="final")
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)
    QuizAttempt.objects.create(
        quiz=final, student=data["student"], passed=True, submitted_at=timezone.now()
    )

    progress = refresh_course_progress(data["enrollment"])

    assert progress.is_completed is True
    assert progress.progress_percent == 100


def test_outstanding_names_the_final_assessment(course_with_sections):
    from apps.quizzes.progression import outstanding_requirements

    data = course_with_sections
    final = build_quiz(data["course"], kind="final")
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)

    outstanding = outstanding_requirements(data["enrollment"])

    assert [item["kind"] for item in outstanding] == ["final"]
    assert outstanding[0]["quizId"] == str(final.id)


def test_outstanding_names_an_unpassed_section_quiz(course_with_sections):
    from apps.quizzes.progression import outstanding_requirements

    data = course_with_sections
    quiz = build_quiz(data["course"], data["sections"][0])
    complete_lessons(data["enrollment"], data["sections"][0])

    outstanding = outstanding_requirements(data["enrollment"])
    section_items = [item for item in outstanding if item["kind"] == "section_quiz"]

    assert len(section_items) == 1
    assert section_items[0]["quizId"] == str(quiz.id)
    assert section_items[0]["sectionTitle"] == data["sections"][0].title


def test_outstanding_counts_remaining_lessons(course_with_sections):
    from apps.quizzes.progression import outstanding_requirements

    data = course_with_sections
    complete_lessons(data["enrollment"], data["sections"][0])

    lessons = [i for i in outstanding_requirements(data["enrollment"]) if i["kind"] == "lessons"]

    assert lessons and lessons[0]["remaining"] == 4


def test_nothing_outstanding_once_the_course_is_finished(course_with_sections):
    from apps.quizzes.progression import outstanding_requirements

    data = course_with_sections
    final = build_quiz(data["course"], kind="final")
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)
    QuizAttempt.objects.create(
        quiz=final, student=data["student"], passed=True, submitted_at=timezone.now()
    )

    assert outstanding_requirements(data["enrollment"]) == []


def test_progression_state_carries_what_is_outstanding(course_with_sections):
    from apps.quizzes.progression import progression_state

    data = course_with_sections
    build_quiz(data["course"], kind="final")
    for section in data["sections"]:
        complete_lessons(data["enrollment"], section)

    state = progression_state(data["enrollment"])

    assert state["certificateEarned"] is False
    assert [item["kind"] for item in state["outstanding"]] == ["final"]
