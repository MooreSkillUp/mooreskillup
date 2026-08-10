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

# Null when the frontend is hosted elsewhere (Vercel) and no web container app
# exists. The fqdn must be checked as well as the module, or interpolating a
# null into the string fails the plan.
output "web_url" {
  value = try(
    module.container_apps[0].web_fqdn != null ? "https://${module.container_apps[0].web_fqdn}" : null,
    null,
  )
}

output "api_url" {
  value = length(module.container_apps) > 0 ? "https://${module.container_apps[0].api_fqdn}" : null
}

output "postgres_host" {
  value = module.postgres.host
}

output "key_vault_name" {
  value = module.key_vault.name
}
