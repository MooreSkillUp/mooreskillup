"""Quiz endpoints.

Student side: see a quiz, start an attempt, submit it, review it.
Teacher side: author quizzes and questions on courses you own.

Everything that decides a score happens here rather than in the browser. The
client is told which questions to show; it is never told which answer is right
until the attempt is closed.
"""

from django.shortcuts import get_object_or_404
from rest_framework import permissions, response, status, views, viewsets

from apps.enrollments.models import Enrollment
from common.permissions import IsStudentUserRole

from .models import Question, Quiz, QuizAttempt, cooldown_remaining_seconds, has_passed
from .progression import progression_state
from .scoring import (
    QuizError,
    attempt_questions,
    review_payload,
    start_attempt,
    submit_attempt,
)
from .serializers import (
    AttemptSerializer,
    StudentQuestionSerializer,
    StudentQuizSerializer,
    TeacherQuestionSerializer,
    TeacherQuizSerializer,
)


def _enrollment_or_none(request, course):
    if not request.user.is_authenticated or getattr(request.user, "role", None) != "student":
        return None
    return Enrollment.objects.with_access().filter(student=request.user.student_profile, course=course).first()


class StudentQuizDetailView(views.APIView):
    """A quiz as a student sees it before starting: what it is, and where they stand."""

    permission_classes = [IsStudentUserRole]

    def get(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, id=quiz_id)
        enrollment = _enrollment_or_none(request, quiz.course)
        if not enrollment:
            return response.Response(
                {"detail": "Enrol in this course to take its quiz."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = request.user.student_profile
        open_attempt = QuizAttempt.objects.filter(
            student=student, quiz=quiz, submitted_at__isnull=True
        ).first()

        return response.Response(
            {
                "quiz": StudentQuizSerializer(quiz).data,
                "isReady": quiz.is_ready,
                "passed": has_passed(student, quiz),
                "cooldownSeconds": cooldown_remaining_seconds(student, quiz),
                "openAttemptId": str(open_attempt.id) if open_attempt else None,
                "attempts": AttemptSerializer(
                    QuizAttempt.objects.filter(
                        student=student, quiz=quiz, submitted_at__isnull=False
                    )[:10],
                    many=True,
                ).data,
            }
        )


class StudentQuizStartView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, id=quiz_id)
        if not _enrollment_or_none(request, quiz.course):
            return response.Response(
                {"detail": "Enrol in this course to take its quiz."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            attempt = start_attempt(request.user.student_profile, quiz)
        except QuizError as error:
            return response.Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(
            {
                "attemptId": str(attempt.id),
                "quiz": StudentQuizSerializer(quiz).data,
                "questions": StudentQuestionSerializer(attempt_questions(attempt), many=True).data,
            }
        )


class StudentQuizSubmitView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(
            QuizAttempt, id=attempt_id, student=request.user.student_profile
        )
        try:
            submit_attempt(attempt, request.data.get("answers") or {})
        except QuizError as error:
            return response.Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        # Passing a section quiz can unlock the next section, and passing a
        # final can earn the certificate — so recompute rather than making the
        # client ask separately and risk showing a stale locked state.
        from apps.progress.views import refresh_course_progress

        enrollment = Enrollment.objects.with_access().filter(
            student=attempt.student, course=attempt.quiz.course
        ).first()
        if enrollment:
            refresh_course_progress(enrollment)

        return response.Response(
            {
                "attempt": AttemptSerializer(attempt).data,
                "passMarkPercent": attempt.quiz.pass_mark_percent,
                "review": review_payload(attempt),
                "progression": progression_state(enrollment) if enrollment else None,
            }
        )


class StudentCourseProgressionView(views.APIView):
    """Where a student stands in a course: what is open, what is left."""

    permission_classes = [IsStudentUserRole]

    def get(self, request, course_id):
        enrollment = Enrollment.objects.with_access().filter(
            student=request.user.student_profile, course_id=course_id
        ).first()
        if not enrollment:
            return response.Response(
                {"detail": "You are not enrolled in this course."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return response.Response(progression_state(enrollment))


# --- teacher authoring -----------------------------------------------------


class IsCourseOwner(permissions.BasePermission):
    """Teachers may only touch quizzes on their own courses; admins, any."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in {"teacher", "admin"}
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "role", None) == "admin":
            return True
        course = obj.course if isinstance(obj, Quiz) else obj.quiz.course
        return bool(course.teacher and course.teacher.user_id == user.id)


class TeacherQuizViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherQuizSerializer
    permission_classes = [IsCourseOwner]

    def get_queryset(self):
        queryset = Quiz.objects.select_related("course", "section").prefetch_related(
            "questions__choices"
        )
        if getattr(self.request.user, "role", None) == "admin":
            pass
        else:
            queryset = queryset.filter(course__teacher__user=self.request.user)

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset


class TeacherQuestionViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherQuestionSerializer
    permission_classes = [IsCourseOwner]

    def get_queryset(self):
        queryset = Question.objects.select_related("quiz__course").prefetch_related("choices")
        if getattr(self.request.user, "role", None) != "admin":
            queryset = queryset.filter(quiz__course__teacher__user=self.request.user)

        quiz_id = self.request.query_params.get("quiz")
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        return queryset
