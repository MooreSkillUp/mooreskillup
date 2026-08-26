"""Starting, scoring and finishing a quiz attempt.

All of it server-side. The client is told which questions to show and which
choices exist, but never which choice is correct — otherwise the answer key is
one devtools panel away and the certificate means nothing.
"""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Choice, Question, QuizAttempt, cooldown_remaining_seconds


class QuizError(Exception):
    """Something the student should be told about, in words they can act on."""


def start_attempt(student, quiz) -> QuizAttempt:
    """Begin an attempt, or hand back one already in progress.

    Resuming rather than restarting matters: a dropped connection halfway
    through should not cost someone their place, and on a patchy mobile network
    that is a normal Tuesday.
    """
    if not quiz.is_ready:
        raise QuizError("This quiz isn't ready yet. Please check back later.")

    existing = (
        QuizAttempt.objects.filter(student=student, quiz=quiz, submitted_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if existing:
        return existing

    waiting = cooldown_remaining_seconds(student, quiz)
    if waiting:
        minutes = max(1, round(waiting / 60))
        raise QuizError(
            f"You can try again in {minutes} minute{'s' if minutes != 1 else ''}."
        )

    questions = quiz.pick_questions()
    return QuizAttempt.objects.create(
        quiz=quiz,
        student=student,
        question_ids=[str(question.id) for question in questions],
    )


def attempt_questions(attempt):
    """The questions this attempt served, in the order it served them.

    Read back from the stored ids rather than re-drawn, so reloading the page
    shows the same quiz — being handed different questions mid-attempt would be
    both unfair and baffling.
    """
    questions = {
        str(question.id): question
        for question in Question.objects.filter(id__in=attempt.question_ids).prefetch_related(
            "choices"
        )
    }
    return [questions[qid] for qid in attempt.question_ids if qid in questions]


@transaction.atomic
def submit_attempt(attempt, answers: dict) -> QuizAttempt:
    """Score an attempt and close it.

    `answers` is {question_id: [choice_id, ...]}. A question counts as right
    only when the chosen set matches the correct set exactly — on a multi-answer
    question, picking one of two correct choices is not a pass, and picking a
    wrong one alongside two right ones is not either.

    No partial credit. It keeps the rule explainable, which matters more here
    than precision: a student who fails needs to understand why.
    """
    if attempt.is_submitted:
        raise QuizError("This attempt has already been submitted.")

    questions = attempt_questions(attempt)
    if not questions:
        raise QuizError("This attempt has no questions. Please start a new one.")

    correct_by_question = {}
    for choice in Choice.objects.filter(question__in=questions, is_correct=True):
        correct_by_question.setdefault(str(choice.question_id), set()).add(str(choice.id))

    right = 0
    cleaned = {}
    for question in questions:
        qid = str(question.id)
        chosen = {str(cid) for cid in (answers.get(qid) or [])}
        cleaned[qid] = sorted(chosen)
        if chosen and chosen == correct_by_question.get(qid, set()):
            right += 1

    score = Decimal(right) / Decimal(len(questions)) * Decimal(100)

    attempt.answers = cleaned
    attempt.score_percent = score.quantize(Decimal("0.01"))
    attempt.passed = score >= Decimal(attempt.quiz.pass_mark_percent)
    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=["answers", "score_percent", "passed", "submitted_at", "updated_at"])
    return attempt


def review_payload(attempt):
    """What to show after submitting: what they picked, what was right, and why.

    Only ever returned for a *submitted* attempt — this is the one place the
    correct answers are disclosed, and doing it earlier would hand over the key.
    """
    if not attempt.is_submitted:
        raise QuizError("Submit the quiz before reviewing it.")

    rows = []
    for question in attempt_questions(attempt):
        qid = str(question.id)
        chosen = set(attempt.answers.get(qid, []))
        correct = {str(c.id) for c in question.choices.all() if c.is_correct}
        rows.append(
            {
                "id": qid,
                "text": question.text,
                "explanation": question.explanation,
                "wasCorrect": bool(chosen) and chosen == correct,
                "choices": [
                    {
                        "id": str(choice.id),
                        "text": choice.text,
                        "isCorrect": choice.is_correct,
                        "wasChosen": str(choice.id) in chosen,
                    }
                    for choice in question.choices.all()
                ],
            }
        )
    return rows
