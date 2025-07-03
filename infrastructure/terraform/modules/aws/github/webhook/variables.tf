variable "api_id" {
  description = "ID of the shared API Gateway"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
}

variable "lambda_source_path" {
  description = "Path to folder containing lambda.zip"
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

variable "lambda_dir" {
  type = string
}

variable "lambda_output_path" {
  description = "Path to the output file of the lambda function"
  type        = string
}
