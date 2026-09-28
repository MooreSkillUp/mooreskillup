# Scheduled work, on Azure's clock rather than a visitor's.
#
# Broadcasts can be scheduled for a date and time — the D-7, D-1 and launch-day
# emails all are. Until now nothing on the server watched the clock: due
# broadcasts were only released when somebody happened to open the app, which
# meant a message set for 09:00 on launch day went out whenever the first
# person of the day signed in. Possibly hours late, possibly not at all on a
# quiet morning.
#
# This runs the same image as the API with a different command, so it shares
# the code, the migrations and the deploy. Every push that updates the API
# updates this too.

resource "azurerm_container_app_job" "scheduled_broadcasts" {
  name                         = "${var.name_prefix}-broadcasts"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  container_app_environment_id = var.environment_id
  tags                         = var.tags

  # Five minutes is close enough for an announcement and cheap enough to ignore:
  # a run that finds nothing due exits in a second or two.
  schedule_trigger_config {
    cron_expression          = "*/5 * * * *"
    parallelism              = 1
    replica_completion_count = 1
  }

  # A run that hangs should not block the next one. Sending is idempotent —
  # a broadcast is claimed by a conditional update before its emails go out —
  # so a retry cannot double-send.
  replica_timeout_in_seconds = 300
  replica_retry_limit        = 1

  secret {
    name  = "acr-password"
    value = var.registry_password
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name    = "broadcasts"
      image   = var.api_image
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["python", "manage.py", "send_due_broadcasts"]

      dynamic "env" {
        for_each = local.job_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
}

locals {
  # The same settings the API runs with, minus everything a one-shot command
  # has no use for: no ingress, no CORS, no payment keys, no storage. A job
  # that cannot reach Paystack cannot accidentally charge anybody.
  job_env = {
    DJANGO_SETTINGS_MODULE = "config.settings.prod"
    DJANGO_SECRET_KEY      = var.django_secret_key
    DJANGO_ALLOWED_HOSTS   = var.django_allowed_hosts
    DATABASE_HOST          = var.postgres_host
    DATABASE_NAME          = var.postgres_db_name
    DATABASE_USER          = var.postgres_admin_username
    DATABASE_PASSWORD      = var.postgres_admin_password
    # Without a key, email falls back to Django's console backend: the run
    # reports success and nobody receives anything.
    BREVO_API_KEY      = var.brevo_api_key
    DEFAULT_FROM_EMAIL = var.default_from_email
    # Links inside the emails.
    FRONTEND_URL = var.frontend_url
    SENTRY_DSN   = var.sentry_dsn
  }
}
