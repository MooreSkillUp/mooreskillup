"""Release scheduled broadcasts and send their emails.

Run on a schedule. Until this existed on a clock, a broadcast set for 09:00 on
launch day was released whenever the next person happened to open the app —
and its emails were never sent at all, because emailing was a separate button
an admin had to press.
"""

from django.core.management.base import BaseCommand

from apps.notifications.delivery import deliver_due_broadcasts, flush_broadcast_emails


class Command(BaseCommand):
    help = "Release scheduled broadcasts whose time has arrived and send any outstanding emails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--max-batches",
            type=int,
            default=20,
            help=(
                "How many email batches this run may send in total, across all broadcasts. "
                "A batch is 120 emails. Anything left is picked up by the next run."
            ),
        )
        parser.add_argument(
            "--skip-emails",
            action="store_true",
            help="Release due broadcasts without sending any email.",
        )

    def handle(self, *args, **options):
        released = deliver_due_broadcasts()
        if released:
            self.stdout.write(f"Released {released} scheduled broadcast(s).")

        if options["skip_emails"]:
            self.stdout.write(self.style.SUCCESS("Done. Emails skipped."))
            return

        sent, waiting = flush_broadcast_emails(max_batches=options["max_batches"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Released {released}, emailed {sent}, {waiting} still to send."
            )
        )
