resource "azurerm_container_app" "api" {
  name                         = "${var.name_prefix}-api"
  resource_group_name          = var.resource_group_name
  container_app_environment_id  = var.environment_id
  revision_mode                = "Single"
  tags                         = var.tags

  secret {
    name  = "acr-password"
    value = var.registry_password
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.api_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "DJANGO_SETTINGS_MODULE"
        value = "config.settings.prod"
      }
      env {
        name  = "DJANGO_SECRET_KEY"
        value = var.django_secret_key
      }
      env {
        name  = "DJANGO_ALLOWED_HOSTS"
        value = var.django_allowed_hosts
      }
      env {
        name  = "CORS_ALLOWED_ORIGINS"
        value = var.cors_allowed_origins
      }
      env {
        name  = "FRONTEND_URL"
        value = var.frontend_url
      }
      env {
        name  = "DATABASE_HOST"
        value = var.postgres_host
      }
      env {
        name  = "DATABASE_NAME"
        value = var.postgres_db_name
      }
      env {
        name  = "DATABASE_USER"
        value = var.postgres_admin_username
      }
      env {
        name  = "DATABASE_PASSWORD"
        value = var.postgres_admin_password
      }
      env {
        name  = "REDIS_URL"
        value = "rediss://${var.redis_host}:${var.redis_port}"
      }
    }
  }
}

resource "azurerm_container_app" "web" {
  name                        = "${var.name_prefix}-web"
  resource_group_name         = var.resource_group_name
  container_app_environment_id = var.environment_id
  revision_mode               = "Single"
  tags                        = var.tags

  secret {
    name  = "acr-password"
    value = var.registry_password
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "web"
      image  = var.web_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = var.next_public_api_url
      }
      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.frontend_url
      }
    }
  }
}
