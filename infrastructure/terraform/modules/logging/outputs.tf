output "workspace_id" { value = azurerm_log_analytics_workspace.this.id }
output "workspace_name" { value = azurerm_log_analytics_workspace.this.name }
output "application_insights_connection_string" { value = azurerm_application_insights.this.connection_string }
