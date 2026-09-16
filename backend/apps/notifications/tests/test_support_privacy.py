"""What the person who raised a ticket is allowed to see.

The admin screen has an "internal note" switch and a box labelled "Admin notes
(internal)". Neither was real: the switch sent `is_internal`, which existed
nowhere in the backend, so DRF dropped it — and every update wrote the text to
`admin_notes`, emailed it to the person as "Reply", and posted it into their
notifications. The student's own page printed it under "Support reply".

So a note an admin wrote about someone went straight to them.
"""

import pytest
from django.core import mail

from apps.notifications.models import Notification, SupportTicket, SupportTicketMessage

from .test_communication import client_for, make_admin, make_student

INTERNAL = "Refunded him twice already — watch this account."
REPLY = "Sorry about that. Clear your cache and try lesson 3 again."


@pytest.fixture
def ticket(db):
    student = make_student()
    row = SupportTicket.objects.create(
        created_by=student.user, category="technical", title="Video won't play", description="Lesson 3."
    )
    mail.outbox.clear()
    return {"student": student, "ticket": row, "admin": make_admin()}


def post_message(ticket, body, internal):
    return client_for(ticket["admin"]).post(
        f"/api/admin/support-tickets/{ticket['ticket'].id}/messages/",
        {"body": body, "isInternal": internal},
        format="json",
    )


def student_sees(ticket):
    rows = client_for(ticket["student"].user).get("/api/student/support-tickets/").json()
    return next(row for row in rows if row["id"] == str(ticket["ticket"].id))


def test_an_internal_note_never_reaches_the_person_who_asked(ticket):
    assert post_message(ticket, INTERNAL, internal=True).status_code == 201

    visible = student_sees(ticket)
    assert INTERNAL not in str(visible)
    assert visible["messages"] == []
    assert not Notification.objects.filter(user=ticket["student"].user, body__icontains="Refunded him").exists()
    assert mail.outbox == []


def test_a_reply_does_reach_them(ticket):
    assert post_message(ticket, REPLY, internal=False).status_code == 201

    visible = student_sees(ticket)
    assert [message["body"] for message in visible["messages"]] == [REPLY]
    assert Notification.objects.filter(user=ticket["student"].user, body__icontains="Clear your cache").exists()
    assert [mail.outbox[0].to] == [[ticket["student"].user.email]]
    assert REPLY in mail.outbox[0].body


def test_changing_the_status_says_so_without_quoting_the_internal_note(ticket):
    post_message(ticket, INTERNAL, internal=True)
    mail.outbox.clear()

    response = client_for(ticket["admin"]).patch(
        f"/api/admin/support-tickets/{ticket['ticket'].id}/", {"status": "resolved"}, format="json"
    )
    assert response.status_code == 200

    told = Notification.objects.filter(user=ticket["student"].user).order_by("-created_at").first()
    assert "resolved" in f"{told.title} {told.body}".lower()
    assert INTERNAL not in f"{told.title} {told.body}"
    assert mail.outbox and INTERNAL not in mail.outbox[0].body


def test_a_silent_edit_does_not_email_anybody(ticket):
    """Changing priority is housekeeping — it used to email the student."""
    client_for(ticket["admin"]).patch(
        f"/api/admin/support-tickets/{ticket['ticket'].id}/", {"priority": "high"}, format="json"
    )
    assert mail.outbox == []
    assert not Notification.objects.filter(user=ticket["student"].user).exists()


def test_the_admin_sees_the_whole_thread_in_order(ticket):
    post_message(ticket, INTERNAL, internal=True)
    post_message(ticket, REPLY, internal=False)

    rows = client_for(ticket["admin"]).get("/api/admin/support-tickets/").json()
    thread = next(row for row in rows if row["id"] == str(ticket["ticket"].id))["messages"]
    assert [(message["body"], message["isInternal"]) for message in thread] == [
        (INTERNAL, True),
        (REPLY, False),
    ]
    assert thread[0]["authorName"] == ticket["admin"].display_name


def test_an_empty_message_is_refused(ticket):
    assert post_message(ticket, "   ", internal=False).status_code == 400
    assert SupportTicketMessage.objects.count() == 0


def test_taking_a_ticket_sticks(ticket):
    """"Assign to me" sent a field the model didn't have, so nothing was taken."""
    response = client_for(ticket["admin"]).post(
        f"/api/admin/support-tickets/{ticket['ticket'].id}/assign/", {}, format="json"
    )
    assert response.status_code == 200
    assert response.json()["assignedToName"] == ticket["admin"].display_name

    ticket["ticket"].refresh_from_db()
    assert ticket["ticket"].assigned_to == ticket["admin"]
    assert ticket["ticket"].assigned_at is not None
    # Who is handling it is not news for the person who raised it.
    assert mail.outbox == []
    assert not Notification.objects.filter(user=ticket["student"].user).exists()

    handed_back = client_for(ticket["admin"]).post(
        f"/api/admin/support-tickets/{ticket['ticket'].id}/assign/", {"assign": False}, format="json"
    )
    assert handed_back.json()["assignedToName"] is None


def test_one_ticket_thread_is_not_visible_to_another_student(ticket):
    post_message(ticket, REPLY, internal=False)
    other = make_student("nosy@t.dev")
    assert client_for(other.user).get("/api/student/support-tickets/").json() == []
