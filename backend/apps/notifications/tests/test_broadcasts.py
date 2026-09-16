"""What the Broadcasts page shows about announcements.

- The list filtered on `created_by=request.user`, so an admin could not see what
  their colleagues had announced — two people could send the same notice twice.
- It never recorded how many people a broadcast reached.
- The page said history "auto-expires after 24 hours". Nothing set an expiry,
  and the notification list ignored `expires_at` anyway, so a broadcast marked
  as expiring stayed in the bell for good.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.notifications.models import BroadcastNotification, Notification

from .test_communication import client_for, make_admin, make_student


@pytest.fixture
def world(db):
    student = make_student()
    return {"student": student, "first": make_admin("one@t.dev"), "second": make_admin("two@t.dev")}


def send(admin, title="Classes resume Monday", **extra):
    return client_for(admin).post(
        "/api/admin/broadcasts/",
        {"title": title, "description": "Please be on time.", "audience": "students", **extra},
        format="json",
    )


def test_an_admin_sees_what_their_colleague_announced(world):
    assert send(world["first"]).status_code == 200

    listing = client_for(world["second"]).get("/api/admin/broadcasts/").json()
    assert [row["title"] for row in listing] == ["Classes resume Monday"]
    assert listing[0]["sentByName"] == world["first"].display_name


def test_it_records_how_many_people_it_reached(world):
    response = send(world["first"])
    assert response.json()["recipientCount"] == 1  # the one student
    assert BroadcastNotification.objects.get().recipient_count == 1


def test_an_expired_broadcast_leaves_the_bell(world):
    send(world["first"], expiresAt=(timezone.now() + timedelta(hours=1)).isoformat())
    bell = client_for(world["student"].user).get("/api/notifications/").json()
    assert len(bell) == 1

    Notification.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert client_for(world["student"].user).get("/api/notifications/").json() == []


def test_an_admin_can_tidy_a_colleagues_entry(world):
    """The list is shared but the delete wasn't: removing someone else's 404'd."""
    send(world["first"])
    broadcast = BroadcastNotification.objects.get()

    response = client_for(world["second"]).delete(f"/api/admin/broadcasts/{broadcast.id}/")
    assert response.status_code == 200
    assert not BroadcastNotification.objects.exists()
    # The people already told keep theirs.
    assert Notification.objects.count() == 1


def test_a_broadcast_with_no_expiry_stays(world):
    send(world["first"])
    assert Notification.objects.get().expires_at is None
    assert len(client_for(world["student"].user).get("/api/notifications/").json()) == 1
