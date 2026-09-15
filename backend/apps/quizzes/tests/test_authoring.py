"""Teacher authoring: writing a quiz through the API the studio actually calls.

The scoring rules were well covered from the start; the *writing* of a quiz was
not, and the first time a teacher tried it in the browser every save failed with
a 500. These pin the round trip.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.quizzes.models import Question, Quiz


@pytest.fixture
def teacher_setup(db):
    user = User.objects.create_user(
        email="t@test.dev", username="t", display_name="T", password="password123", role="teacher"
    )
    profile = TeacherProfile.objects.create(user=user, program="Web", track="Frontend")
    category = Category.objects.create(name="Cat")
    subcategory = Subcategory.objects.create(category=category, name="Sub")
    course = Course.objects.create(
        teacher=profile, category=category, subcategory=subcategory, title="C", status="published"
    )
    quiz = Quiz.objects.create(course=course, kind="final", title="Final", is_published=True)

    client = APIClient()
    client.force_authenticate(user=user)
    return {"client": client, "course": course, "quiz": quiz, "user": user}


def test_a_question_can_be_written_through_the_api(teacher_setup):
    """The exact call the studio makes when a teacher saves a question.

    This failed with a 500 for every save: TeacherQuestionSerializer did not
    list `quiz` in its fields, so DRF dropped the id the client sent and the
    insert hit a NOT NULL constraint. Nothing in the type system or the build
    catches a missing serializer field — only calling it does.
    """
    response = teacher_setup["client"].post(
        "/api/teacher/quiz-questions/",
        {
            "quiz": str(teacher_setup["quiz"].id),
            "text": "Does this save?",
            "explanation": "It should.",
            "order": 0,
            "choices": [
                {"text": "Yes", "isCorrect": True, "order": 0},
                {"text": "No", "isCorrect": False, "order": 1},
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    question = Question.objects.get(text="Does this save?")
    assert question.quiz_id == teacher_setup["quiz"].id
    assert question.choices.count() == 2
    assert question.choices.filter(is_correct=True).count() == 1


def test_editing_a_question_replaces_its_choices(teacher_setup):
    """Choices are edited as a set, so a PUT replaces rather than merges."""
    client = teacher_setup["client"]
    created = client.post(
        "/api/teacher/quiz-questions/",
        {
            "quiz": str(teacher_setup["quiz"].id),
            "text": "First",
            "choices": [
                {"text": "A", "isCorrect": True},
                {"text": "B", "isCorrect": False},
            ],
        },
        format="json",
    )
    question_id = created.data["id"]

    updated = client.put(
        f"/api/teacher/quiz-questions/{question_id}/",
        {
            "quiz": str(teacher_setup["quiz"].id),
            "text": "Second",
            "choices": [
                {"text": "X", "isCorrect": False},
                {"text": "Y", "isCorrect": True},
                {"text": "Z", "isCorrect": False},
            ],
        },
        format="json",
    )

    assert updated.status_code == 200, updated.data
    question = Question.objects.get(id=question_id)
    assert question.text == "Second"
    assert question.choices.count() == 3
    assert question.choices.get(is_correct=True).text == "Y"


def test_a_teacher_cannot_touch_another_teachers_quiz(teacher_setup):
    """Ownership is enforced by the queryset, not by hiding the button."""
    other = User.objects.create_user(
        email="o@test.dev", username="o", display_name="O", password="password123", role="teacher"
    )
    TeacherProfile.objects.create(user=other, program="Web", track="Frontend")

    client = APIClient()
    client.force_authenticate(user=other)

    listing = client.get(f"/api/teacher/quizzes/?course={teacher_setup['course'].id}")
    assert listing.status_code == 200
    rows = listing.data.get("results", listing.data)
    assert rows == [], "another teacher's quiz must not be listed"


def test_the_studio_can_create_a_quiz_for_a_course(teacher_setup):
    response = teacher_setup["client"].post(
        "/api/teacher/quizzes/",
        {
            "course": str(teacher_setup["course"].id),
            "section": None,
            "kind": "final",
            "title": "Another final",
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    assert Quiz.objects.filter(title="Another final").exists()
