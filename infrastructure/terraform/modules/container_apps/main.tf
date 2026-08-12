resource "azurerm_container_app" "api" {
  name                         = "${var.name_prefix}-api"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.environment_id
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
      # Uploads go to blob storage; a container filesystem does not survive a
      # deploy, so without these every uploaded image is lost on the next one.
      # Temporary: return the refresh token in the auth response body so the
      # app can keep a fallback copy. Needed only because the frontend
      # (Vercel) and the API (Azure) are on different registrable domains, which
      # makes the httpOnly session cookie third-party — Safari drops it outright
      # and an installed PWA partitions storage harder still, so students are
      # signed out on every launch.
      #
      # Set this to "false" the moment both sit under one domain. The cookie
      # path already works and is strictly safer.
      env {
        name  = "AUTH_RETURN_REFRESH_IN_BODY"
        value = var.auth_return_refresh_in_body
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = var.storage_account_name
      }
      env {
        name  = "AZURE_STORAGE_KEY"
        value = var.storage_account_key
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER"
        value = var.storage_media_container
      }
    }
  }
}

# Only created when a web image is supplied. Deployments that keep the
# frontend on Vercel simply leave web_image empty.
resource "azurerm_container_app" "web" {
  count = var.web_image != "" ? 1 : 0

  name                         = "${var.name_prefix}-web"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.environment_id
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
