# AWS DynamoDB
output "aws_dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.table_name
}

# AWS Cognito
output "aws_cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}
output "aws_cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}

# AWS API Gateway
output "aws_api_gateway_id" {
  description = "API Gateway ID"
  value       = module.apigateway.api_id
}
output "aws_api_gateway_endpoint" {
  description = "API Gateway URL"
  value       = module.apigateway.endpoint
}


# Github
output "github_webhook_aws_lambda_function_name" {
  description = "GitHub Webhook Lambda function name"
  value       = module.github_webhook.lambda_function_name
}
output "github_webhook_aws_lambda_function_arn" {
  description = "GitHub Webhook Lambda function ARN"
  value       = module.github_webhook.lambda_arn
}
