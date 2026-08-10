output "api_fqdn" { value = azurerm_container_app.api.latest_revision_fqdn }

# Null when the frontend is hosted elsewhere (Vercel) and no web image was given.
output "web_fqdn" {
  value = length(azurerm_container_app.web) > 0 ? azurerm_container_app.web[0].latest_revision_fqdn : null
}
