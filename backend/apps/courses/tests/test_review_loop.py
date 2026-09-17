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


def test_the_checklist_is_not_computed_outside_the_admin_list(loop):
    """The catalog and the studio never ask for it, so they must not pay for it."""
    teacher_user, course, _ = loop
    seen = client_for(teacher_user).get(f"/api/teacher/courses/{course.id}/").json()
    assert "reviewSummary" not in seen
    assert Course.objects.filter(id=course.id).exists()


def test_the_admin_course_list_costs_the_same_however_many_courses(loop):
    """It reused the catalog serializer: 248 queries for thirteen courses.

    A constant query count is the property that matters — whatever the number
    is today, a fortieth course must not add to it.
    """
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    from apps.courses.models import Section

    teacher_user, course, admin = loop
    client = client_for(admin)

    def queries():
        with CaptureQueriesContext(connection) as ctx:
            assert client.get("/api/admin/courses/").status_code == 200
        # Count the list's own work. The platform-settings singleton is read by
        # middleware and created on first access, so whether its queries appear
        # depends on the cache, not on how many courses there are.
        return len(
            [
                q
                for q in ctx.captured_queries
                if "platform_platformsettings" not in q["sql"] and "SAVEPOINT" not in q["sql"]
            ]
        )

    baseline = queries()
    for index in range(4):
        extra = Course.objects.create(
            teacher=course.teacher, category=course.category, subcategory=course.subcategory,
            title=f"Extra course {index}", subtitle="s", overview="o", scheme_of_work="w",
        )
        section = Section.objects.create(course=extra, title="S", description="d", order=1)
        Lesson.objects.create(section=section, title="L", content_type="text", order=1)

    assert queries() == baseline


def test_the_admin_chrome_gets_its_counts_without_the_course_list(loop):
    """The sidebar badge and the bell read this, not the eight-endpoint loader."""
    teacher_user, course, admin = loop
    submit(teacher_user, course)

    data = client_for(admin).get("/api/admin/alerts/").json()
    assert data["pendingReviews"] == 1
    assert data["reviewQueue"][0]["id"] == str(course.id)
    assert data["reviewQueue"][0]["submittedAt"] is not None


def test_a_teacher_cannot_read_the_admin_alerts(loop):
    teacher_user, _, _ = loop
    assert client_for(teacher_user).get("/api/admin/alerts/").status_code in (401, 403)


def approve(reviewer, course):
    return client_for(reviewer).post(f"/api/admin/courses/{course.id}/approve/")


def test_approving_reaches_the_teachers_bell(loop):
    """Approval used to send an email and nothing else.

    A teacher who works inside the app — or whose mail lands in spam — never
    learned their course had gone live, while a decline always showed up. Good
    news has to travel the same way bad news does.
    """
    from apps.notifications.models import Notification

    teacher_user, course, admin = loop
    submit(teacher_user, course)
    Notification.objects.filter(user=teacher_user).delete()

    response = approve(admin, course)
    assert response.status_code == 200, response.data

    notifications = Notification.objects.filter(user=teacher_user)
    assert notifications.count() == 1
    assert course.title in notifications.first().title


def test_declining_emails_the_teacher_once(loop):
    """The decline path sent two near-identical emails about one decline."""
    from django.core import mail

    teacher_user, course, admin = loop
    submit(teacher_user, course)
    mail.outbox.clear()

    response = decline(admin, course, "Add a length to every lesson.")
    assert response.status_code == 200, response.data

    assert len(mail.outbox) == 1, [message.subject for message in mail.outbox]
    assert "declined" in mail.outbox[0].subject.lower()


def test_approving_emails_the_teacher_once(loop):
    """The in-app notification must not have brought a second email with it."""
    from django.core import mail

    teacher_user, course, admin = loop
    submit(teacher_user, course)
    mail.outbox.clear()

    assert approve(admin, course).status_code == 200
    assert len(mail.outbox) == 1, [message.subject for message in mail.outbox]
    assert "approved" in mail.outbox[0].subject.lower()
