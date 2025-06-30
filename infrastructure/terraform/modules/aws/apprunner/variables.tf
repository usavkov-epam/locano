variable "service_name" {
  description = "App Runner service name"
  type        = string
}

variable "ecr_repo_name" {
  description = "ECR repository name"
  type        = string
}

variable "service_port" {
  description = "Service port"
  type        = string
}
