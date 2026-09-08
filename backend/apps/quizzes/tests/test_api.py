"""The quiz endpoints, including the one promise that matters most:
the answer key never leaves the server before an attempt is scored.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.enrollments.models import Enrollment
from apps.quizzes.models import Choice, Question, Quiz


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def api_setup(db):
    teacher_user = User.objects.create_user(
        email="t@test.dev", username="t", display_name="T", password="password123", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="P", track="T")

    student_user = User.objects.create_user(
        email="st@test.dev", username="st", display_name="St", password="password123"
    )
    student = StudentProfile.objects.create(user=student_user)

    category = Category.objects.create(name="C")
    subcategory = Subcategory.objects.create(category=category, name="S")
    course = Course.objects.create(
        category=category,
        subcategory=subcategory,
        title="Course",
        status="published",
        # The catalogue viewset filters on both, so a course that is published
        # but hidden is a 404 — which is correct, and easy to trip over in a test.
        visibility="visible",
        teacher=teacher,
    )
    section = Section.objects.create(course=course, title="S1", description="", order=0)
    Lesson.objects.create(section=section, title="L", content_type="text", order=0)

    quiz = Quiz.objects.create(
        course=course, section=section, kind="section", title="Q", is_published=True
    )
    question = Question.objects.create(quiz=quiz, text="2+2?")
    right = Choice.objects.create(question=question, text="4", is_correct=True)
    Choice.objects.create(question=question, text="5", is_correct=False)

    return {
        "teacher_user": teacher_user,
        "student_user": student_user,
        "student": student,
        "course": course,
        "section": section,
        "quiz": quiz,
        "question": question,
        "right": right,
    }


def test_the_answer_key_is_never_sent_to_a_student(api_setup):
    """The single most important guarantee in this feature.

    If `isCorrect` reaches the browser before submission, every quiz is
    trivially passable and the certificate is decoration.
    """
    Enrollment.objects.create(
        student=api_setup["student"], course=api_setup["course"], access_source="free"
    )
    client = client_for(api_setup["student_user"])

    res = client.post(f"/api/quizzes/{api_setup['quiz'].id}/start/")
    assert res.status_code == 200

    body = str(res.json())
    assert "isCorrect" not in body
    assert "is_correct" not in body
    # And the explanation, which usually gives it away, is withheld too.
    assert "explanation" not in body


def test_a_student_must_be_enrolled_to_start(api_setup):
    client = client_for(api_setup["student_user"])
    res = client.post(f"/api/quizzes/{api_setup['quiz'].id}/start/")
    assert res.status_code == 403


def test_submitting_scores_and_reveals_the_answers(api_setup):
    Enrollment.objects.create(
        student=api_setup["student"], course=api_setup["course"], access_source="free"
    )
    client = client_for(api_setup["student_user"])

    started = client.post(f"/api/quizzes/{api_setup['quiz'].id}/start/").json()
    attempt_id = started["attemptId"]

    res = client.post(
        f"/api/quiz-attempts/{attempt_id}/submit/",
        {"answers": {str(api_setup["question"].id): [str(api_setup["right"].id)]}},
        format="json",
    )
    assert res.status_code == 200
    body = res.json()

    assert float(body["attempt"]["scorePercent"]) == 100.0
    assert body["attempt"]["passed"] is True
    # Only now are the correct answers disclosed. Asserted by identity rather
    # than position: both choices share order=0, so their order is not fixed.
    review_choices = body["review"][0]["choices"]
    correct = next(c for c in review_choices if c["id"] == str(api_setup["right"].id))
    assert correct["isCorrect"] is True
    assert correct["wasChosen"] is True
    assert body["review"][0]["wasCorrect"] is True


def test_one_student_cannot_submit_another_students_attempt(api_setup):
    Enrollment.objects.create(
        student=api_setup["student"], course=api_setup["course"], access_source="free"
    )
    started = client_for(api_setup["student_user"]).post(
        f"/api/quizzes/{api_setup['quiz'].id}/start/"
    ).json()

    intruder_user = User.objects.create_user(
        email="x@test.dev", username="x", display_name="X", password="password123"
    )
    StudentProfile.objects.create(user=intruder_user)

    res = client_for(intruder_user).post(
        f"/api/quiz-attempts/{started['attemptId']}/submit/", {"answers": {}}, format="json"
    )
    assert res.status_code == 404


def test_a_teacher_can_only_author_on_their_own_courses(api_setup):
    other_user = User.objects.create_user(
        email="o@test.dev", username="o", display_name="O", password="password123", role="teacher"
    )
    TeacherProfile.objects.create(user=other_user, program="P", track="T")

    # The owner sees their quiz.
    owned = client_for(api_setup["teacher_user"]).get("/api/teacher/quizzes/")
    assert owned.status_code == 200
    assert len(owned.json().get("results", owned.json())) == 1

    # Another teacher sees nothing.
    theirs = client_for(other_user).get("/api/teacher/quizzes/")
    assert theirs.status_code == 200
    assert len(theirs.json().get("results", theirs.json())) == 0


def test_progression_reports_where_a_student_stands(api_setup):
    Enrollment.objects.create(
        student=api_setup["student"], course=api_setup["course"], access_source="free"
    )
    res = client_for(api_setup["student_user"]).get(
        f"/api/courses/{api_setup['course'].id}/progression/"
    )
    assert res.status_code == 200
    body = res.json()

    assert body["mode"] == "open"
    assert body["certificateEarned"] is False
    assert str(api_setup["section"].id) in body["accessibleSectionIds"]


def test_sequential_gating_reaches_the_course_page(api_setup):
    """The rules are useless if the page a student reads doesn't apply them.

    Exercises the whole path: progression rules -> serializer context ->
    `isLocked` on the section the student hasn't reached yet.
    """
    from apps.courses.models import Section

    course = api_setup["course"]
    course.progression_mode = "sequential"
    course.save(update_fields=["progression_mode"])

    second = Section.objects.create(course=course, title="S2", description="", order=1)
    Lesson.objects.create(section=second, title="L2", content_type="text", order=0)

    Enrollment.objects.create(
        student=api_setup["student"], course=course, access_source="free"
    )

    res = client_for(api_setup["student_user"]).get(f"/api/courses/{course.id}/")
    assert res.status_code == 200

    sections = {s["title"]: s for s in res.json()["sections"]}
    assert sections["S1"]["isLocked"] is False
    # Nothing in S1 is done, so S2 must not be reachable.
    assert sections["S2"]["isLocked"] is True


def test_an_open_course_locks_nothing_by_progression(api_setup):
    """The default mode must never gate — a regression here strands everyone."""
    from apps.courses.models import Section

    course = api_setup["course"]  # progression_mode defaults to "open"
    second = Section.objects.create(course=course, title="S2", description="", order=1)
    Lesson.objects.create(section=second, title="L2", content_type="text", order=0)

    Enrollment.objects.create(
        student=api_setup["student"], course=course, access_source="free"
    )

    res = client_for(api_setup["student_user"]).get(f"/api/courses/{course.id}/")
    sections = {s["title"]: s for s in res.json()["sections"]}

    assert sections["S1"]["isLocked"] is False
    assert sections["S2"]["isLocked"] is False
