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

variable "redis_host" {
  type = string
}

variable "redis_port" {
  type = number
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
