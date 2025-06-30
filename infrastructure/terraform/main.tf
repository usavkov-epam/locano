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