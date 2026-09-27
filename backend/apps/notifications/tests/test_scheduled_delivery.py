"""Scheduled broadcasts reaching people, on time and by email.

Two things were wrong, and the second was the expensive one.

Nothing on the server watched the clock: a broadcast set for 09:00 on launch
day was released whenever the next person happened to open the app. Late on a
busy morning, and not at all on a quiet one.

And releasing a scheduled broadcast only ever created the in-app notifications.
The emails were a separate step that happened when an admin pressed a button,
batch by batch — so a scheduled announcement appeared in the app on time and
went out by email never. The D-7, D-1 and launch-day emails all depend on it.
"""

from datetime import timedelta
from io import StringIO

import pytest
from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.delivery import (
    broadcasts_awaiting_email,
    deliver_due_broadcasts,
    flush_broadcast_emails,
)
from apps.notifications.models import (
    BroadcastEmailReceipt,
    BroadcastNotification,
    Notification,
)


def a_student(index):
    return User.objects.create_user(
        email=f"student{index}@msu.dev",
        username=f"student{index}",
        display_name=f"Student {index}",
        password="x",
        role="student",
    )


def an_admin():
    existing = User.objects.filter(role="admin").first()
    if existing is not None:
        return existing
    return User.objects.create_user(
        email="boss@msu.dev",
        username="boss",
        display_name="Boss",
        password="x",
        role="admin",
        admin_role="super_admin",
    )


def a_broadcast(when=None, send_email=True, title="Launch day"):
    return BroadcastNotification.objects.create(
        created_by=an_admin(),
        title=title,
        description="We are live.",
        audience="students",
        status="scheduled" if when else "draft",
        scheduled_at=when,
        send_email=send_email,
    )


@pytest.fixture
def students(db):
    return [a_student(index) for index in range(3)]


class TestReleasingOnTime:
    def test_a_broadcast_whose_time_has_come_is_released(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1))

        released = deliver_due_broadcasts()

        assert released == 1
        assert BroadcastNotification.objects.get().status == "sent"
        assert Notification.objects.count() == 3

    def test_a_broadcast_scheduled_for_later_waits(self, students, db):
        a_broadcast(when=timezone.now() + timedelta(hours=2))

        assert deliver_due_broadcasts() == 0
        assert Notification.objects.count() == 0

    def test_releasing_twice_does_not_duplicate(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1))

        deliver_due_broadcasts()
        deliver_due_broadcasts()

        assert Notification.objects.count() == 3


class TestTheEmailsActuallyGoOut:
    def test_a_released_broadcast_emails_its_audience(self, students, db):
        """The gap that mattered: releasing created the in-app notifications
        and stopped there."""
        a_broadcast(when=timezone.now() - timedelta(minutes=1))
        deliver_due_broadcasts()
        assert len(mail.outbox) == 0

        sent, waiting = flush_broadcast_emails()

        assert sent == 3
        assert waiting == 0
        assert len(mail.outbox) == 3

    def test_nobody_is_emailed_twice(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1))
        deliver_due_broadcasts()
        flush_broadcast_emails()

        sent, waiting = flush_broadcast_emails()

        assert sent == 0
        assert waiting == 0
        assert len(mail.outbox) == 3

    def test_a_broadcast_that_did_not_ask_for_email_sends_none(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1), send_email=False)
        deliver_due_broadcasts()

        sent, _ = flush_broadcast_emails()

        assert sent == 0
        assert len(mail.outbox) == 0

    def test_it_works_through_more_than_one_broadcast(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=5), title="D-7")
        a_broadcast(when=timezone.now() - timedelta(minutes=1), title="D-1")
        deliver_due_broadcasts()

        sent, waiting = flush_broadcast_emails()

        assert sent == 6
        assert waiting == 0

    def test_the_batch_budget_is_respected_and_the_rest_waits(self, students, db):
        """One run cannot take an unbounded amount of time. What is left is
        picked up next time, because receipts make that safe."""
        a_broadcast(when=timezone.now() - timedelta(minutes=5), title="D-7")
        a_broadcast(when=timezone.now() - timedelta(minutes=1), title="D-1")
        deliver_due_broadcasts()

        sent, waiting = flush_broadcast_emails(max_batches=1)

        assert sent == 3
        assert waiting == 3

        sent, waiting = flush_broadcast_emails()
        assert sent == 3
        assert waiting == 0

    def test_a_failed_address_does_not_stall_the_batch(self, students, db):
        """A receipt is written either way. A bad mailbox that failed once will
        fail every time, and retrying it forever would hold up everyone behind
        it."""
        a_broadcast(when=timezone.now() - timedelta(minutes=1))
        deliver_due_broadcasts()
        flush_broadcast_emails()

        assert BroadcastEmailReceipt.objects.count() == 3
        assert flush_broadcast_emails() == (0, 0)

    def test_nothing_waiting_is_reported_as_nothing(self, db):
        assert flush_broadcast_emails() == (0, 0)
        assert broadcasts_awaiting_email().count() == 0


class TestTheCommand:
    def test_it_releases_and_emails_in_one_run(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1))
        out = StringIO()

        call_command("send_due_broadcasts", stdout=out)

        assert "Released 1" in out.getvalue()
        assert "emailed 3" in out.getvalue()
        assert len(mail.outbox) == 3

    def test_emails_can_be_skipped(self, students, db):
        a_broadcast(when=timezone.now() - timedelta(minutes=1))
        out = StringIO()

        call_command("send_due_broadcasts", "--skip-emails", stdout=out)

        assert BroadcastNotification.objects.get().status == "sent"
        assert len(mail.outbox) == 0

    def test_a_quiet_run_says_so_and_changes_nothing(self, db):
        out = StringIO()
        call_command("send_due_broadcasts", stdout=out)

        assert "Released 0" in out.getvalue()
