variable "name_prefix" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "environment_id" {
  type = string
}

variable "registry_server" {
  type = string
}

variable "registry_username" {
  type = string
}

variable "registry_password" {
  type      = string
  sensitive = true
}

variable "api_image" {
  type = string
}

variable "web_image" {
  type = string
}

variable "django_secret_key" {
  type      = string
  sensitive = true
}

variable "django_allowed_hosts" {
  type = string
}

variable "cors_allowed_origins" {
  type = string
}

variable "frontend_url" {
  type = string
}

variable "next_public_api_url" {
  type = string
}

variable "postgres_host" {
  type = string
}

variable "postgres_db_name" {
  type = string
}

variable "postgres_admin_username" {
  type = string
}

variable "postgres_admin_password" {
  type      = string
  sensitive = true
}

variable "min_replicas" {
  type    = number
  default = 1
}

variable "max_replicas" {
  type    = number
  default = 3
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "storage_account_name" {
  type        = string
  description = "Blob storage account holding uploaded media."
}

variable "storage_account_key" {
  type        = string
  sensitive   = true
  description = "Access key for the media storage account."
}

variable "storage_media_container" {
  type        = string
  default     = "media"
  description = "Blob container that uploads are written to."
}

variable "auth_return_refresh_in_body" {
  type        = string
  default     = "false"
  description = "Return the refresh token in the auth response body. Only needed while the app and API are on different domains."
}
