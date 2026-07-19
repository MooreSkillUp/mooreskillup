locals {
  name_prefix = regexreplace(lower("${var.project_name}-${var.environment}"), "[^a-z0-9-]", "")

  common_tags = merge(
    {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
    },
    var.tags,
  )

  resource_group_name   = "rg-${local.name_prefix}"
  acr_name              = regexreplace("acr${local.name_prefix}", "[^a-z0-9]", "")
  storage_account_name   = substr(regexreplace("st${local.name_prefix}", "[^a-z0-9]", ""), 0, 24)
  key_vault_name         = substr(regexreplace("kv${local.name_prefix}", "[^a-z0-9]", ""), 0, 24)
  postgres_server_name   = substr(regexreplace("psql${local.name_prefix}", "[^a-z0-9]", ""), 0, 63)
  redis_name             = substr(regexreplace("redis${local.name_prefix}", "[^a-z0-9]", ""), 0, 63)
  log_analytics_name     = "law-${local.name_prefix}"
  app_insights_name      = "appi-${local.name_prefix}"
  container_env_name     = "acae-${local.name_prefix}"
  api_container_name     = "api"
  web_container_name     = "web"
  api_image              = var.api_image != "" ? var.api_image : "${module.acr.login_server}/api:latest"
  web_image              = var.web_image != "" ? var.web_image : "${module.acr.login_server}/web:latest"
}
