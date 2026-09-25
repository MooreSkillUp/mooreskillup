resource "azurerm_storage_account" "this" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  # Course banners, avatars and course art are shown on public pages and in
  # link previews, so their blobs have to be readable without a signature.
  # Only the media container opts in; backups and certificates stay private.
  allow_nested_items_to_be_public = true
  tags                            = var.tags

  # Course banners, avatars and certificate PDFs live here, not in the database,
  # so the database backup does not cover them. Soft delete keeps a deleted or
  # overwritten file recoverable for 14 days, matching the database window.
  # Azure charges for it as ordinary storage, which is pennies at this size.
  blob_properties {
    delete_retention_policy {
      days = 14
    }
    container_delete_retention_policy {
      days = 14
    }
  }
}

resource "azurerm_storage_container" "media" {
  name                 = "media"
  storage_account_name = azurerm_storage_account.this.name
  # "blob" is read-only access to each file by its URL. Nobody can list the
  # container or write to it. Uploaded images returned 409 to the browser
  # before this, so a course banner never displayed.
  container_access_type = "blob"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "certificates" {
  name                  = "certificates"
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}
