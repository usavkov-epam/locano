variable "lambda_function_name" {
  type        = string
  description = "Name of the Lambda function for consuming SQS messages"
}

variable "sqs_queue_url" {
  type        = string
  description = "URL of the SQS queue"
}

variable "sqs_queue_arn" {
  type        = string
  description = "ARN of the SQS queue"
}

variable "lambda_handler" {
  type    = string
}

variable "lambda_runtime" {
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