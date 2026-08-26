"""Quizzes: the only thing on this platform we can actually verify.

Assignments and projects are submitted off-platform by design — WhatsApp, Google
Forms — which makes them excellent for community and useless as a gate. A quiz
is answered here, so it is what section unlocking and the certificate hang on.

Two shapes, one model:

* **Section quiz** — attached to a section. In a sequential course, passing it
  opens the next section.
* **Final assessment** — attached to the course. Passing it earns the
  certificate.

Both are optional. A teacher can run a course with neither, either, or both, and
each combination behaves sensibly — which is what stops students getting stuck
behind something nobody meant to put there.
"""

import random

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.models import TimeStampedModel, UUIDPrimaryKeyModel

# Long enough to stop someone brute-forcing a five-question quiz, short enough
# that a student who genuinely misread a question isn't punished for it.
RETRY_COOLDOWN_MINUTES = 15


class Quiz(UUIDPrimaryKeyModel, TimeStampedModel):
    """A set of questions, attached to either a section or a course."""

    KIND_CHOICES = (
        ("section", "Section quiz"),
        ("final", "Final assessment"),
    )

    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="quizzes")
    # Null for a final assessment, which belongs to the course as a whole.
    section = models.OneToOneField(
        "courses.Section",
        on_delete=models.CASCADE,
        related_name="quiz",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="section")

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Per quiz rather than global: a five-question warm-up and a final exam
    # should not share one threshold.
    pass_mark_percent = models.PositiveIntegerField(
        default=70, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    # How many of the written questions each attempt serves. 0 means all of
    # them. Serving a subset is what makes unlimited retries safe — you cannot
    # memorise five answers if the next attempt asks five different questions.
    questions_per_attempt = models.PositiveIntegerField(default=5)

    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "quizzes"
        ordering = ("kind", "created_at")

    def __str__(self):
        return f"{self.title} ({self.get_kind_display()})"

    @property
    def question_count(self) -> int:
        return self.questions.count()

    def pick_questions(self):
        """Questions for one attempt, drawn from the pool and shuffled.

        Returns every question when the pool is smaller than the requested
        count, so a teacher who wrote exactly five gets exactly five.
        """
        pool = list(self.questions.prefetch_related("choices"))
        wanted = self.questions_per_attempt or len(pool)
        if wanted >= len(pool):
            random.shuffle(pool)
            return pool
        return random.sample(pool, wanted)

    @property
    def is_ready(self) -> bool:
        """Whether this quiz can be served without embarrassing anybody.

        A published quiz with no questions, or with questions that have no
        correct answer, would block a student behind something unanswerable.
        """
        if not self.is_published:
            return False
        questions = list(self.questions.prefetch_related("choices"))
        if not questions:
            return False
        return all(question.choices.filter(is_correct=True).exists() for question in questions)


class Question(UUIDPrimaryKeyModel, TimeStampedModel):
    """One question. Multiple choice, with one or more correct answers."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    # Shown after answering, right or wrong — a quiz that only says "incorrect"
    # teaches nothing.
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("order", "created_at")

    def __str__(self):
        return self.text[:60]

    @property
    def is_multi_select(self) -> bool:
        return self.choices.filter(is_correct=True).count() > 1


class Choice(UUIDPrimaryKeyModel):
    """One option. Several may be correct; the UI adapts."""

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")

    def __str__(self):
        return self.text[:60]


class QuizAttempt(UUIDPrimaryKeyModel, TimeStampedModel):
    """One student's run at one quiz.

    Every attempt is kept rather than overwritten: a teacher looking at a
    struggling student needs the history, and a certificate that rests on a
    score should be able to show where that score came from.
    """

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(
        "accounts.StudentProfile", on_delete=models.CASCADE, related_name="quiz_attempts"
    )

    # The questions this attempt served, so it can be resumed and reviewed
    # exactly as it was sat.
    question_ids = models.JSONField(default=list)
    # {question_id: [choice_id, ...]} — empty until submitted.
    answers = models.JSONField(default=dict, blank=True)

    score_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    passed = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["student", "quiz", "-created_at"])]

    def __str__(self):
        return f"{self.student_id} · {self.quiz_id} · {self.score_percent}%"

    @property
    def is_submitted(self) -> bool:
        return self.submitted_at is not None


def has_passed(student, quiz) -> bool:
    """Whether this student has ever passed this quiz."""
    return QuizAttempt.objects.filter(student=student, quiz=quiz, passed=True).exists()


def cooldown_remaining_seconds(student, quiz, *, now=None) -> int:
    """Seconds until this student may attempt the quiz again.

    Zero when they may start now — which includes never having tried, and
    having already passed. Only a *failed* attempt starts the clock, so nobody
    waits to retake something they got right.
    """
    if has_passed(student, quiz):
        return 0

    now = now or timezone.now()
    last = (
        QuizAttempt.objects.filter(student=student, quiz=quiz, submitted_at__isnull=False)
        .order_by("-submitted_at")
        .first()
    )
    if not last:
        return 0

    elapsed = (now - last.submitted_at).total_seconds()
    remaining = RETRY_COOLDOWN_MINUTES * 60 - elapsed
    return max(0, int(remaining))
