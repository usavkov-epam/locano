module "dynamodb" {
  source     = "./modules/aws/dynamodb"
  table_name = var.dynamodb_table_name
}

# module "apprunner" {
#   source        = "./modules/aws/apprunner"
#   service_name  = var.apprunner_service_name
#   ecr_repo_name = var.ecr_repo_name
#   service_port  = "3000"
# }

module "ssm" {
  source          = "./modules/aws/ssm"
  parameter_name  = var.ssm_api_key_name
  parameter_value = var.ssm_api_key_value
}

module "cognito" {
  source                = "./modules/aws/cognito"
  user_pool_name        = var.cognito_user_pool_name
  user_pool_client_name = var.cognito_user_pool_client_name
  region                = var.aws_region
  password_policy       = var.password_policy
}

module "apigateway" {
  source = "./modules/aws/api-gateway"
  name   = var.api_gateway_name
}

module "github_webhook" {
  source = "./modules/aws/github/webhook"
  api_id = module.apigateway.api_id
  lambda_source_path = "../../apps/api/lambdas/github-webhook"
  lambda_function_name = var.gh_webhook_lambda_function_name
  lambda_handler = var.gh_webhook_lambda_handler
  lambda_runtime = var.gh_webhook_lambda_runtime
  route_key = var.gh_webhook_route_key
  depends_on = [ module.apigateway ]

  lambda_dir = "${path.module}/lambdas"
  lambda_output_path    = "github_webhook.lambda.zip"
}
