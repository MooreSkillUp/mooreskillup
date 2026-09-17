"""Prove that email actually leaves the building.

Every silent-email failure this platform has had looked identical from the
inside: `send()` returns, nothing raises, and the message goes to a container
log or is refused by the provider. So before trusting invites and password
resets to it, send one real message and go and look in the inbox.

    python manage.py send_test_email --to you@example.com
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from common.email import platform_name, send_transactional_email
from common.mail_backend import backend_delivers


class Command(BaseCommand):
    help = "Send one real transactional email, to check delivery end to end."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Where to send it.")

    def handle(self, *args, **options):
        recipient = options["to"].strip()
        if "@" not in recipient:
            raise CommandError(f"{recipient!r} is not an email address.")

        backend = settings.EMAIL_BACKEND
        sender = settings.DEFAULT_FROM_EMAIL

        self.stdout.write(f"Backend:  {backend}")
        self.stdout.write(f"From:     {sender or '(empty — the provider will refuse this)'}")
        self.stdout.write(f"To:       {recipient}")
        self.stdout.write("")

        if not backend_delivers(backend):
            self.stdout.write(
                self.style.WARNING(
                    "This backend delivers nothing — the message will be written to the log "
                    "and no one will receive it. Set BREVO_API_KEY and deploy first."
                )
            )

        sent = send_transactional_email(
            to_email=recipient,
            subject=f"{platform_name()} email test",
            heading="Email is working",
            greeting="Hello,",
            intro=(
                "If you're reading this in your inbox, the platform can send mail: teacher "
                "invites, sign-in codes, password resets and receipts will all arrive."
            ),
            details=[
                {"label": "Sent from", "value": sender or "(empty)"},
                {"label": "Backend", "value": backend.rsplit(".", 2)[0]},
            ],
            footer="Sent by a one-off check, not by anything a student did.",
        )

        if not sent:
            raise CommandError(
                "The provider refused it. Check the API key, and that the From address is a "
                "sender you have verified with them."
            )

        if backend_delivers(backend):
            self.stdout.write(self.style.SUCCESS("Handed to the provider."))
            self.stdout.write("Now go and look in that inbox — check spam too, and tell me which.")
        else:
            self.stdout.write("Written to the log, as expected for this backend.")
