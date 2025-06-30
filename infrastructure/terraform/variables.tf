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
