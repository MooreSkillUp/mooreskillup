# The app's stable hostname, not `latest_revision_fqdn`.
#
# latest_revision_fqdn returns the *revision* address —
# mooreskillup-prod-api--0000001.<env>.azurecontainerapps.io — and that suffix
# changes every time a new revision is created. Anything pinned to it (Vercel's
# NEXT_PUBLIC_API_URL, a DNS CNAME, a webhook URL given to Paystack) silently
# breaks on the next deploy.
#
# ingress.fqdn always points at whichever revision is currently live.
output "api_fqdn" { value = azurerm_container_app.api.ingress[0].fqdn }

# Null when the frontend is hosted elsewhere (Vercel) and no web image was given.
output "web_fqdn" {
  value = length(azurerm_container_app.web) > 0 ? azurerm_container_app.web[0].ingress[0].fqdn : null
}
