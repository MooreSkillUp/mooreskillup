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

variable "redis_family" {
  type        = string
  description = "Redis family."
  default     = "C"
}

variable "redis_capacity" {
  type        = number
  description = "Redis capacity."
  default     = 0
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
  description = "Minimum replicas for container apps."
  default     = 1
}

variable "container_apps_max_replicas" {
  type        = number
  description = "Maximum replicas for container apps."
  default     = 3
}
