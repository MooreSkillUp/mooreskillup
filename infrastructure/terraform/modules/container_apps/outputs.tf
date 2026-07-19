output "api_fqdn" { value = azurerm_container_app.api.latest_revision_fqdn }
output "web_fqdn" { value = azurerm_container_app.web.latest_revision_fqdn }
