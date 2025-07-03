variable "aws_region" {
  description = "AWS region where the resources will be created"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  sensitive = true
}

variable "api_id" {
  description = "ID of the shared API Gateway"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
}

variable "lambda_handler" {
  type    = string
}

variable "lambda_runtime" {
  type    = string
}

variable "route_key" {
  type    = string
}

variable "lambda_output_path" {
  description = "Path to the output file of the lambda function"
  type        = string
}

variable "s3_bucket" {
  description = "S3 bucket for Lambda ZIP files"
  type        = string
}

variable "sqs_queue_url" {
  description = "URL of the SQS queue for GitHub webhook events"
  type        = string
}

variable "github_webhook_secret" {
  description = "GitHub webhook secret for validating incoming requests"
  type        = string
  sensitive   = true
}
