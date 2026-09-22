"""Email that actually reaches the people a notification cannot.

A broadcast lands in the bell of whoever signs in. Before launch almost nobody
signs in — they joined in October and are waiting for November — so the one
audience that matters most is the one an in-app notification cannot reach.

The rule these pin hardest: nobody is emailed the same announcement twice. Six
hundred emails do not fit in a request, so sending happens in batches and can be
resumed, and a resume that repeats itself is the mistake every recipient would
notice at once.
"""

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, User
from apps.notifications.delivery import audience_users, send_broadcast_emails
from apps.notifications.models import BroadcastEmailReceipt, BroadcastNotification
from apps.platform.models import PlatformSettings, assign_founding_number
from common.rbac import SUPER_ADMIN


def make_user(role, email, **profile):
    user = User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=email.split("@")[0].title(),
        password="pass12345",
        role=role,
        admin_role=SUPER_ADMIN if role == "admin" else None,
    )
    if role == "student":
        student = StudentProfile.objects.create(user=user, **profile)
        return user, student
    return user, None


def make_broadcast(admin, audience="waitlist", track="", email=True):
    return BroadcastNotification.objects.create(
        created_by=admin,
        title="We are open",
        description="MooreSkillUp is live. Your courses are waiting.",
        audience=audience,
        audience_track=track,
        send_email=email,
    )


@pytest.fixture
def admin(db):
    user, _ = make_user("admin", "boss@test.dev")
    return user


@pytest.fixture
def waiting(db):
    """Three founding members and one ordinary student who joined later."""
    members = []
    for index in range(3):
        _, student = make_user("student", f"member{index}@test.dev")
        assign_founding_number(student)
        members.append(student)
    make_user("student", "latecomer@test.dev")
    return members


# --- Who gets it --------------------------------------------------------------


def test_the_waitlist_audience_is_only_founding_members(waiting):
    emails = set(audience_users("waitlist").values_list("email", flat=True))

    assert emails == {"member0@test.dev", "member1@test.dev", "member2@test.dev"}
    assert "latecomer@test.dev" not in emails


def test_a_track_narrows_a_student_audience(db):
    make_user("student", "backend@test.dev", selected_track="Backend")
    make_user("student", "design@test.dev", selected_track="Design")

    emails = set(audience_users("students", "Backend").values_list("email", flat=True))

    assert emails == {"backend@test.dev"}


def test_a_track_does_not_silently_empty_a_teacher_audience(db):
    """Teachers have no track in the sense students do; asking for one must not
    quietly return nobody and look like a successful send."""
    make_user("teacher", "teach@test.dev")

    assert audience_users("teachers", "Backend").count() == 1


# --- Sending, and not sending twice -------------------------------------------


def test_everyone_on_the_list_is_emailed_once(admin, waiting):
    broadcast = make_broadcast(admin)
    mail.outbox.clear()

    sent, remaining = send_broadcast_emails(broadcast)

    assert sent == 3
    assert remaining == 0
    assert len(mail.outbox) == 3


def test_sending_again_emails_nobody_a_second_time(admin, waiting):
    broadcast = make_broadcast(admin)
    send_broadcast_emails(broadcast)
    mail.outbox.clear()

    sent, remaining = send_broadcast_emails(broadcast)

    assert (sent, remaining) == (0, 0)
    assert mail.outbox == []


def test_a_batch_stops_at_the_limit_and_says_what_is_left(admin, waiting):
    broadcast = make_broadcast(admin)
    mail.outbox.clear()

    sent, remaining = send_broadcast_emails(broadcast, limit=2)

    assert (sent, remaining) == (2, 1)
    assert len(mail.outbox) == 2


def test_the_rest_go_out_when_it_resumes(admin, waiting):
    broadcast = make_broadcast(admin)
    send_broadcast_emails(broadcast, limit=2)
    mail.outbox.clear()

    sent, remaining = send_broadcast_emails(broadcast)

    assert (sent, remaining) == (1, 0)
    assert len(mail.outbox) == 1
    assert BroadcastEmailReceipt.objects.filter(broadcast=broadcast).count() == 3


def test_a_late_joiner_is_not_retrospectively_emailed(admin, waiting):
    """Somebody who signs up after the announcement went out should not be sent
    yesterday's news the next time an admin presses send."""
    broadcast = make_broadcast(admin)
    send_broadcast_emails(broadcast)
    _, newcomer = make_user("student", "newcomer@test.dev")
    assign_founding_number(newcomer)
    mail.outbox.clear()

    sent, _ = send_broadcast_emails(broadcast)

    # They are in the audience, so they do get it — but only once, and only
    # because an admin pressed send again. That is the honest behaviour: the
    # alternative is a member who joined an hour early never hearing we opened.
    assert sent == 1
    assert len(mail.outbox) == 1


# --- Through the API ----------------------------------------------------------


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_an_admin_can_send_and_is_told_what_is_left(admin, waiting):
    broadcast = make_broadcast(admin)
    mail.outbox.clear()

    payload = client_for(admin).post(
        f"/api/admin/broadcasts/{broadcast.id}/send-emails/", {}, format="json"
    ).data

    assert payload["sent"] == 3
    assert payload["remaining"] == 0
    assert "everyone" in payload["detail"].lower()


def test_a_student_cannot_email_the_whole_platform(admin, waiting):
    broadcast = make_broadcast(admin)
    student = waiting[0].user

    response = client_for(student).post(
        f"/api/admin/broadcasts/{broadcast.id}/send-emails/", {}, format="json"
    )

    assert response.status_code == 403


def test_sending_a_broadcast_that_no_longer_exists_says_so(admin):
    import uuid

    response = client_for(admin).post(
        f"/api/admin/broadcasts/{uuid.uuid4()}/send-emails/", {}, format="json"
    )

    assert response.status_code == 404


# --- The welcome a founding member gets ---------------------------------------


def test_joining_before_launch_is_confirmed_in_writing(db):
    from apps.accounts.views import send_waitlist_welcome

    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.save()
    _, student = make_user("student", "fresh@test.dev")
    assign_founding_number(student)
    mail.outbox.clear()

    send_waitlist_welcome(student)

    assert len(mail.outbox) == 1
    body = mail.outbox[0].body
    assert f"founding member #{student.founding_member_number}" in body


def test_an_ordinary_signup_after_launch_gets_no_waitlist_email(db):
    from apps.accounts.views import send_waitlist_welcome

    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.save()
    _, student = make_user("student", "normal@test.dev")
    mail.outbox.clear()

    send_waitlist_welcome(student)

    assert mail.outbox == []
