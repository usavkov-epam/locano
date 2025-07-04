
variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "lambdas_s3_bucket" {
  description = "S3 bucket for Lambda ZIP files"
  type        = string
}
variable "aws_lambda_runtime" {
  description = "Runtime for the GitHub Webhook Lambda function"
  type        = string
  default     = "nodejs20.x"
}
variable "aws_lambda_handler" {
  description = "Handler for the Lambda function"
  type        = string
  default     = "index.handler"
}


/* Cognito */
variable "cognito_user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
}
variable "cognito_user_pool_client_name" {
  description = "Name of the Cognito User Pool Client"
  type        = string
}
variable "password_policy" {
  description = "Password policy for the user pool"
}

/* API Gateway */
variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
}

/* GitHub */
variable "github_app_id" {
  description = "GitHub App ID for the webhook"
  type        = string
}
variable "github_app_private_key" {
  description = "GitHub App private key for authentication"
  type        = string
  sensitive   = true
}
variable "github_webhook_secret" {
  description = "GitHub webhook secret for validating incoming requests"
  type        = string
  sensitive   = true
}
variable "gh_webhook_lambda_function_name" {
  description = "Name of the GitHub Webhook Lambda function"
  type        = string
}
variable "gh_webhook_route_key" {
  description = "Route key for the GitHub Webhook API Gateway route"
  type        = string
  default     = "POST /github/webhook"
}
variable "gh_queue_name" {
  description = "Name of the SQS queue for GitHub webhook events"
  type        = string
}
variable "gh_consumer_lambda_name" {
  description = "Name of the Lambda function for consuming SQS messages"
  type        = string
}
