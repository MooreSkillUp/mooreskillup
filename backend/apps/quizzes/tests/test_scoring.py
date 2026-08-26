"""Scoring, and the promise that the answer key never leaves the server."""

import pytest
from django.utils import timezone

from apps.accounts.models import StudentProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.quizzes.models import Choice, Question, Quiz, QuizAttempt
from apps.quizzes.scoring import QuizError, review_payload, start_attempt, submit_attempt


@pytest.fixture
def quiz_setup(db):
    user = User.objects.create_user(
        email="q@test.dev", username="q", display_name="Q", password="password123"
    )
    student = StudentProfile.objects.create(user=user)
    category = Category.objects.create(name="C")
    subcategory = Subcategory.objects.create(category=category, name="S")
    course = Course.objects.create(
        category=category, subcategory=subcategory, title="C", status="published"
    )
    quiz = Quiz.objects.create(
        course=course, kind="final", title="Final", is_published=True, questions_per_attempt=0
    )

    # Two single-answer questions and one multi-answer.
    q1 = Question.objects.create(quiz=quiz, text="Q1", order=0)
    Choice.objects.create(question=q1, text="right", is_correct=True, order=0)
    Choice.objects.create(question=q1, text="wrong", is_correct=False, order=1)

    q2 = Question.objects.create(quiz=quiz, text="Q2", order=1)
    Choice.objects.create(question=q2, text="right", is_correct=True, order=0)
    Choice.objects.create(question=q2, text="wrong", is_correct=False, order=1)

    q3 = Question.objects.create(quiz=quiz, text="Q3", order=2)
    Choice.objects.create(question=q3, text="a", is_correct=True, order=0)
    Choice.objects.create(question=q3, text="b", is_correct=True, order=1)
    Choice.objects.create(question=q3, text="c", is_correct=False, order=2)

    return {"student": student, "quiz": quiz, "questions": [q1, q2, q3]}


def correct_ids(question):
    return [str(c.id) for c in question.choices.filter(is_correct=True)]


def test_all_correct_passes(quiz_setup):
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    answers = {str(q.id): correct_ids(q) for q in quiz_setup["questions"]}

    submit_attempt(attempt, answers)
    attempt.refresh_from_db()

    assert float(attempt.score_percent) == 100.0
    assert attempt.passed is True


def test_a_partly_answered_multi_select_is_wrong(quiz_setup):
    """Half of a multi-answer question is not half right — it is wrong.

    No partial credit, deliberately: the rule has to be explainable to a student
    who just failed, and "you needed both" is easier to accept than a fraction.
    """
    q1, q2, q3 = quiz_setup["questions"]
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])

    submit_attempt(
        attempt,
        {
            str(q1.id): correct_ids(q1),
            str(q2.id): correct_ids(q2),
            str(q3.id): correct_ids(q3)[:1],  # only one of the two
        },
    )
    attempt.refresh_from_db()

    # Two of three, so below the default 70% pass mark.
    assert round(float(attempt.score_percent)) == 67
    assert attempt.passed is False


def test_an_unanswered_question_is_wrong(quiz_setup):
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    submit_attempt(attempt, {})
    attempt.refresh_from_db()

    assert float(attempt.score_percent) == 0.0
    assert attempt.passed is False


def test_starting_again_resumes_rather_than_restarts(quiz_setup):
    """A dropped connection must not cost someone their attempt."""
    first = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    second = start_attempt(quiz_setup["student"], quiz_setup["quiz"])

    assert first.id == second.id
    assert QuizAttempt.objects.filter(student=quiz_setup["student"]).count() == 1


def test_an_attempt_cannot_be_submitted_twice(quiz_setup):
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    submit_attempt(attempt, {})

    with pytest.raises(QuizError):
        submit_attempt(attempt, {})


def test_review_is_refused_before_submission(quiz_setup):
    """The answer key is disclosed on review, so review must wait for a score."""
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])

    with pytest.raises(QuizError):
        review_payload(attempt)


def test_review_shows_what_was_right_and_why(quiz_setup):
    q1, _q2, _q3 = quiz_setup["questions"]
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    submit_attempt(attempt, {str(q1.id): correct_ids(q1)})

    rows = review_payload(attempt)
    first = next(row for row in rows if row["id"] == str(q1.id))

    assert first["wasCorrect"] is True
    assert any(choice["isCorrect"] and choice["wasChosen"] for choice in first["choices"])


def test_an_unready_quiz_cannot_be_started(quiz_setup):
    """A published quiz with no questions is a trap, not a test."""
    empty = Quiz.objects.create(
        course=quiz_setup["quiz"].course, kind="section", title="Empty", is_published=True
    )

    with pytest.raises(QuizError):
        start_attempt(quiz_setup["student"], empty)


def test_the_cooldown_blocks_an_immediate_retry(quiz_setup):
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    submit_attempt(attempt, {})  # fails

    with pytest.raises(QuizError, match="try again"):
        start_attempt(quiz_setup["student"], quiz_setup["quiz"])


def test_questions_come_from_a_pool(quiz_setup):
    """Serving a subset is what makes unlimited retries safe."""
    quiz = quiz_setup["quiz"]
    quiz.questions_per_attempt = 2
    quiz.save(update_fields=["questions_per_attempt"])

    attempt = QuizAttempt.objects.create(
        quiz=quiz,
        student=quiz_setup["student"],
        question_ids=[str(q.id) for q in quiz.pick_questions()],
    )
    assert len(attempt.question_ids) == 2

    # Passing an old attempt shouldn't matter; the point is the pool is larger
    # than any single attempt, so answers cannot simply be memorised.
    assert quiz.questions.count() == 3


def test_a_finished_attempt_keeps_the_questions_it_served(quiz_setup):
    """Reloading mid-attempt must show the same quiz, not a fresh draw."""
    quiz = quiz_setup["quiz"]
    quiz.questions_per_attempt = 2
    quiz.save(update_fields=["questions_per_attempt"])

    attempt = start_attempt(quiz_setup["student"], quiz)
    served = list(attempt.question_ids)

    resumed = start_attempt(quiz_setup["student"], quiz)
    assert resumed.question_ids == served


def test_passing_clears_the_way_to_retry_freely(quiz_setup):
    """Someone who passed is never held behind a cooldown."""
    attempt = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    answers = {str(q.id): correct_ids(q) for q in quiz_setup["questions"]}
    submit_attempt(attempt, answers)

    # Passed, so a new attempt starts immediately rather than waiting.
    again = start_attempt(quiz_setup["student"], quiz_setup["quiz"])
    assert again.id != attempt.id
    assert again.submitted_at is None
    assert timezone.now() is not None
