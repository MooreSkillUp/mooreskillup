from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.finance"

    def ready(self):
        # Importing for the side effect of connecting the signal that freezes
        # a course's earning terms when it is published.
        from . import signals  # noqa: F401
