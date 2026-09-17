"""The two ways email configuration fails without anyone noticing.

Both have already happened here: production ran on the console backend for its
whole life, and it also carries an *empty* DEFAULT_FROM_EMAIL — because the
deploy passes every variable explicitly, so an unset one arrives as "" rather
than being absent, and an empty environment variable beats a getenv default.

That second one is invisible until the day a Brevo key is added, at which point
every message is refused for having no sender.
"""

from io import StringIO

import pytest
from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from common.mail_backend import BREVO, CONSOLE, backend_delivers, choose_email_backend, sender_address


class TestSenderAddress:
    def test_an_empty_setting_falls_back(self):
        assert sender_address("", "fallback@example.com") == "fallback@example.com"

    def test_whitespace_is_not_an_address(self):
        assert sender_address("   ", "fallback@example.com") == "fallback@example.com"

    def test_a_real_value_wins(self):
        assert sender_address("MooreSkillUp <no-reply@msu.test>", "fallback@example.com") == (
            "MooreSkillUp <no-reply@msu.test>"
        )


class TestBackendChoice:
    def test_a_key_means_send_it(self):
        assert choose_email_backend("", "xkeysib-abc") == BREVO

    def test_no_key_means_nobody_gets_it(self):
        assert choose_email_backend("", "") == CONSOLE
        assert backend_delivers(CONSOLE) is False


class TestSendTestEmailCommand:
    def test_it_sends_one_message_to_the_address_given(self, db):
        mail.outbox.clear()
        out = StringIO()

        call_command("send_test_email", to="someone@example.com", stdout=out)

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["someone@example.com"]
        assert "working" in mail.outbox[0].subject.lower() or "test" in mail.outbox[0].subject.lower()

    def test_it_refuses_something_that_is_not_an_address(self, db):
        with pytest.raises(CommandError):
            call_command("send_test_email", to="not-an-address")

    @override_settings(EMAIL_BACKEND=CONSOLE)
    def test_it_warns_when_the_backend_delivers_nothing(self, db):
        out = StringIO()

        call_command("send_test_email", to="someone@example.com", stdout=out)

        assert "delivers nothing" in out.getvalue()
