resource "azurerm_container_registry" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  # Basic is ample for one project's images; Standard costs ~4x for
  # storage and throughput this project will not use.
  sku                           = "Basic"
  admin_enabled                 = true
  public_network_access_enabled = true
  tags                          = var.tags
}
