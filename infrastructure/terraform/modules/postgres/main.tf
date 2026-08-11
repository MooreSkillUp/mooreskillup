resource "azurerm_postgresql_flexible_server" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "16"
  administrator_login           = var.administrator_login
  administrator_password        = var.administrator_password
  sku_name                      = var.sku_name
  storage_mb                    = 32768
  backup_retention_days         = 7
  public_network_access_enabled = true
  tags                          = var.tags

  # Azure assigns the availability zone when it creates the server. The config
  # does not name one, so without this every plan shows a phantom change trying
  # to unset it — a needless in-place update on a live database.
  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "this" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Container Apps get dynamic outbound IPs, so there is no fixed address to allow.
# The 0.0.0.0-0.0.0.0 range is Azure's special case meaning "allow Azure
# services", not "allow the internet" — public traffic is still rejected.
#
# Without this the server accepts nothing at all and the API sits forever on
# "Waiting for database...". The stronger option is VNet integration with a
# private endpoint, which removes public access entirely; it costs more and is
# worth doing before real student data lives here.
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
