variable "project_name" {
  type        = string
  description = "Short project name used in Azure resource naming."
  default     = "mooreskillup"
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
}

variable "location" {
  type        = string
  description = "Azure region."
  default     = "eastus"
}

variable "tenant_id" {
  type        = string
  description = "Azure tenant ID for Key Vault and identity resources."
}

variable "tags" {
  type        = map(string)
  description = "Common tags applied to all Azure resources."
  default     = {}
}

variable "django_secret_key" {
  type        = string
  description = "Django secret key."
  sensitive   = true
}

variable "django_allowed_hosts" {
  type        = string
  description = "Comma-separated allowed hosts for Django."
}

variable "cors_allowed_origins" {
  type        = string
  description = "Comma-separated frontend origins allowed by Django."
}

variable "frontend_url" {
  type        = string
  description = "Public frontend URL."
}

variable "next_public_api_url" {
  type        = string
  description = "Public API URL exposed to the frontend."
}

variable "db_admin_username" {
  type        = string
  description = "PostgreSQL admin username."
  default     = "msuadmin"
}

variable "db_admin_password" {
  type        = string
  description = "PostgreSQL admin password."
  sensitive   = true
}

variable "db_sku_name" {
  type        = string
  description = "PostgreSQL flexible server SKU."
  default     = "B_Standard_B1ms"
}

variable "api_image" {
  type        = string
  description = "Container image for the API."
  default     = ""
}

variable "web_image" {
  type        = string
  description = "Container image for the frontend."
  default     = ""
}

variable "container_apps_min_replicas" {
  type        = number
  description = <<-EOT
    Minimum replicas for container apps.

    0 means the app scales to zero when idle: you pay only for requests actually
    served, and the first request after a quiet spell waits 10-30s for a cold
    start. Correct while building. Set to 1 before real students depend on it,
    so nobody ever meets that wait.
  EOT
  default     = 0
}

variable "container_apps_max_replicas" {
  type        = number
  description = "Maximum replicas for container apps."
  default     = 3
}
