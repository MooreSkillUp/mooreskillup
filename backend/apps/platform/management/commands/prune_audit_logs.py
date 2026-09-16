"""Delete audit entries past the retention window.

Pruning used to happen on every read of the Activity logs page, which made
opening a page a destructive act. It belongs on a schedule instead — run this
from cron, or Azure Container Apps' scheduled job, once a day.
"""

from django.core.management.base import BaseCommand

from apps.platform.models import PlatformSettings
from apps.platform.views import prune_expired_logs


class Command(BaseCommand):
    help = "Delete audit log entries older than the configured retention window."

    def handle(self, *args, **options):
        days = PlatformSettings.get_solo().audit_retention_days
        deleted = prune_expired_logs()
        self.stdout.write(
            self.style.SUCCESS(f"Removed {deleted} audit entries older than {days} days.")
        )
