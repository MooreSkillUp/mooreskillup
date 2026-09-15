"""The course review loop: submit, send back, fix, resubmit, approve.

Before this, a reviewer's reason for declining a course existed only inside an
email and a notification. Nothing stored it on the course, so a teacher opening
their declined course in the studio saw "Declined" and no explanation — and with
production on the console email backend, nobody received the email either. The
reason was also optional, so a course could be sent back with nothing at all.

These pin the loop so it cannot quietly become a dead end again.
"""

import pytest
from django.core.cache import cache

from apps.courses.models import Course, Lesson
from common.rbac import MODERATOR, SUPER_ADMIN

from .test_workflow import client_for, make_admin, make_full_course, make_teacher


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def loop(db):
    from apps.categories.models import Category, Subcategory

    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    teacher_user, profile = make_teacher()
    course = make_full_course(profile, category, subcategory)
    admin = make_admin(SUPER_ADMIN, "reviewer@test.dev")
    return teacher_user, course, admin


def submit(teacher_user, course):
    response = client_for(teacher_user).post(f"/api/teacher/courses/{course.id}/publish/")
    assert response.status_code == 200, response.data
    course.refresh_from_db()


def decline(reviewer, course, reason):
    return client_for(reviewer).post(
        f"/api/admin/courses/{course.id}/decline/", {"reason": reason}, format="json"
    )


def test_a_course_cannot_be_sent_back_without_a_reason(loop):
    """A decline with no note gives the teacher nothing to act on."""
    teacher_user, course, admin = loop
    submit(teacher_user, course)

    for empty in ("", "   "):
        response = decline(admin, course, empty)
        assert response.status_code == 400
        assert "reason" in response.data

    course.refresh_from_db()
    assert course.status == "review", "a refused decline must not change the course"


def test_the_reason_is_stored_on_the_course_where_the_teacher_can_see_it(loop):
    teacher_user, course, admin = loop
    submit(teacher_user, course)

    response = decline(admin, course, "Section 1 has no video yet.")
    assert response.status_code == 200, response.data

    course.refresh_from_db()
    assert course.status == "declined"
    assert course.decline_reason == "Section 1 has no video yet."
    assert course.reviewed_by == admin
    assert course.reviewed_at is not None

    # The studio loads the course through the teacher API — the note has to be
    # in that payload, not only in an email.
    seen = client_for(teacher_user).get(f"/api/teacher/courses/{course.id}/").json()
    assert seen["declineReason"] == "Section 1 has no video yet."


def test_resubmitting_keeps_the_note_for_the_next_reviewer(loop):
    """A reviewer picking up a resubmission needs to know what was asked for."""
    teacher_user, course, admin = loop
    submit(teacher_user, course)
    first_submission = course.submitted_at
    decline(admin, course, "Add a course overview.")

    submit(teacher_user, course)

    assert course.status == "review"
    assert course.decline_reason == "Add a course overview."
    assert course.submitted_at is not None
    assert course.submitted_at >= first_submission


def test_approval_clears_the_note(loop):
    teacher_user, course, admin = loop
    submit(teacher_user, course)
    decline(admin, course, "Add a course overview.")
    submit(teacher_user, course)

    response = client_for(admin).post(f"/api/admin/courses/{course.id}/approve/")
    assert response.status_code == 200, response.data

    course.refresh_from_db()
    assert course.status == "published"
    assert course.decline_reason == ""
    assert course.reviewed_by == admin


def test_a_moderator_can_send_a_course_back(loop):
    """Declining is on the moderator's permission list, so it has to work for them."""
    teacher_user, course, _ = loop
    moderator = make_admin(MODERATOR, "mod@test.dev")
    submit(teacher_user, course)

    response = decline(moderator, course, "Lesson titles need to describe the content.")
    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert course.reviewed_by == moderator


def test_a_teacher_cannot_decline_their_own_course(loop):
    teacher_user, course, _ = loop
    submit(teacher_user, course)

    response = decline(teacher_user, course, "Nothing wrong here.")
    assert response.status_code in (401, 403)


def test_the_queue_reports_what_a_reviewer_would_otherwise_open_every_lesson_to_find(loop):
    teacher_user, course, admin = loop
    section = course.sections.first()
    # A video lesson with no video — the thing a reviewer most needs to catch.
    Lesson.objects.create(section=section, title="Empty", content_type="video", video_url="", order=2)
    submit(teacher_user, course)

    rows = client_for(admin).get("/api/admin/courses/").json()
    row = next(item for item in rows if item["id"] == str(course.id))
    summary = row["reviewSummary"]

    assert summary["lessons"] == 2
    assert summary["emptyLessons"] == 1
    assert summary["hasReadyFinal"] is False
    assert row["submittedAt"] is not None


def test_the_checklist_is_not_computed_outside_the_review_queue(loop):
    """The catalog and the studio never ask for it, so they must not pay for it."""
    teacher_user, course, _ = loop
    seen = client_for(teacher_user).get(f"/api/teacher/courses/{course.id}/").json()
    assert seen["reviewSummary"] is None
    assert Course.objects.filter(id=course.id).exists()
