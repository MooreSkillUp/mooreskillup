output "resource_group_name" {
  value = module.resource_group.name
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "acr_admin_username" {
  value = module.acr.admin_username
}

output "acr_admin_password" {
  value     = module.acr.admin_password
  sensitive = true
}

output "web_url" {
  value = length(module.container_apps) > 0 ? "https://${module.container_apps[0].web_fqdn}" : null
}

output "api_url" {
  value = length(module.container_apps) > 0 ? "https://${module.container_apps[0].api_fqdn}" : null
}

output "postgres_host" {
  value = module.postgres.host
}

output "redis_host" {
  value = module.redis.host
}

output "key_vault_name" {
  value = module.key_vault.name
}
