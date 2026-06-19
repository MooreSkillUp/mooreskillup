from django.core.management.base import BaseCommand

from apps.notifications.delivery import deliver_due_broadcasts


class Command(BaseCommand):
    help = "Deliver scheduled broadcasts whose send time has arrived. Run from cron for timely delivery."

    def handle(self, *args, **options):
        sent = deliver_due_broadcasts()
        self.stdout.write(self.style.SUCCESS(f"Sent {sent} due broadcast(s)."))
