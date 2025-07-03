variable "aws_region" {
  description = "AWS region"
  type        = string
}

/* DynamoDB */
variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

# /* App runner */
# variable "apprunner_service_name" {}

# variable "ecr_repo_name" {}

/* System management */
variable "ssm_api_key_name" {
  description = "Name of the SSM Parameter Store API key"
  type        = string
}
variable "ssm_api_key_value" {
  description = "Value of the SSM Parameter Store API key"
  type        = string
}

/* Cognito */
variable "cognito_user_pool_name" {
  description = "Name of the Cognito User Pool"
  type    = string
}
variable "cognito_user_pool_client_name" {
  description = "Name of the Cognito User Pool Client"
  type    = string
}
variable "password_policy" {
  description = "Password policy for the user pool"
}

/* API Gateway */
variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
}

/* GitHub Webhook */
variable "gh_webhook_lambda_function_name" {
  description = "Name of the GitHub Webhook Lambda function"
  type        = string
}
variable "gh_webhook_lambda_handler" {
  description = "Handler for the GitHub Webhook Lambda function"
  type    = string
  default = "index.handler"
}
variable "gh_webhook_lambda_runtime" {
  description = "Runtime for the GitHub Webhook Lambda function"
  type    = string
  default = "nodejs20.x"
}
variable "gh_webhook_route_key" {
  description = "Route key for the GitHub Webhook API Gateway route"
  type    = string
  default = "POST /github/webhook"
}
