module "resource_group" {
  source   = "./modules/resource_group"
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

module "logging" {
  source              = "./modules/logging"
  name                = local.log_analytics_name
  app_insights_name   = local.app_insights_name
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.common_tags
}

module "acr" {
  source              = "./modules/container_registry"
  name                = local.acr_name
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.common_tags
}

module "storage" {
  source              = "./modules/storage"
  name                = local.storage_account_name
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.common_tags
}

module "key_vault" {
  source              = "./modules/key_vault"
  name                = local.key_vault_name
  resource_group_name = module.resource_group.name
  location            = var.location
  tenant_id           = var.tenant_id
  tags                = local.common_tags
}

module "postgres" {
  source              = "./modules/postgres"
  name                = local.postgres_server_name
  resource_group_name = module.resource_group.name
  location            = var.location
  administrator_login = var.db_admin_username
  administrator_password = var.db_admin_password
  sku_name            = var.db_sku_name
  tags                = local.common_tags
}

module "redis" {
  source              = "./modules/redis"
  name                = local.redis_name
  resource_group_name = module.resource_group.name
  location            = var.location
  family              = var.redis_family
  capacity            = var.redis_capacity
  tags                = local.common_tags
}

module "container_app_environment" {
  source                     = "./modules/container_app_environment"
  name                       = local.container_env_name
  resource_group_name        = module.resource_group.name
  location                   = var.location
  log_analytics_workspace_id = module.logging.workspace_id
  tags                       = local.common_tags
}

module "container_apps" {
  count = var.api_image != "" && var.web_image != "" ? 1 : 0

  source                      = "./modules/container_apps"
  name_prefix                 = local.name_prefix
  resource_group_name         = module.resource_group.name
  environment_id              = module.container_app_environment.id
  registry_server             = module.acr.login_server
  registry_username           = module.acr.admin_username
  registry_password           = module.acr.admin_password
  api_image                   = local.api_image
  web_image                   = local.web_image
  django_secret_key           = var.django_secret_key
  django_allowed_hosts        = var.django_allowed_hosts
  cors_allowed_origins        = var.cors_allowed_origins
  frontend_url                = var.frontend_url
  next_public_api_url         = var.next_public_api_url
  postgres_host               = module.postgres.host
  postgres_db_name            = module.postgres.database_name
  postgres_admin_username     = var.db_admin_username
  postgres_admin_password     = var.db_admin_password
  redis_host                  = module.redis.host
  redis_port                  = module.redis.port
  min_replicas                = var.container_apps_min_replicas
  max_replicas                = var.container_apps_max_replicas
  tags                        = local.common_tags
}
