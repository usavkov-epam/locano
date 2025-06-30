output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.table_name
}

# output "apprunner_service_url" {
#   description = "App Runner service URL"
#   value       = module.apprunner.service_url
# }

output "ssm_parameter_name" {
  description = "SSM Parameter Store API key name"
  value       = module.ssm.parameter_name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}
