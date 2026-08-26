from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    StudentCourseProgressionView,
    StudentQuizDetailView,
    StudentQuizStartView,
    StudentQuizSubmitView,
    TeacherQuestionViewSet,
    TeacherQuizViewSet,
)

router = DefaultRouter()
router.register("teacher/quizzes", TeacherQuizViewSet, basename="teacher-quiz")
router.register("teacher/quiz-questions", TeacherQuestionViewSet, basename="teacher-quiz-question")

urlpatterns = [
    path("quizzes/<uuid:quiz_id>/", StudentQuizDetailView.as_view(), name="quiz-detail"),
    path("quizzes/<uuid:quiz_id>/start/", StudentQuizStartView.as_view(), name="quiz-start"),
    path("quiz-attempts/<uuid:attempt_id>/submit/", StudentQuizSubmitView.as_view(), name="quiz-submit"),
    path(
        "courses/<uuid:course_id>/progression/",
        StudentCourseProgressionView.as_view(),
        name="course-progression",
    ),
    *router.urls,
]
