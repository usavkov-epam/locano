module "dynamodb" {
  source     = "./modules/aws/dynamodb"
  table_name = var.dynamodb_table_name
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

module "github_queue" {
  source = "./modules/aws/github/queue"

  sqs_queue_name = var.gh_queue_name
}

module "github_webhook" {
  source = "./modules/aws/github/webhook"

  aws_region = var.aws_region
  api_id     = module.apigateway.api_id

  lambda_function_name = var.gh_webhook_lambda_function_name
  lambda_handler       = var.aws_lambda_handler
  lambda_runtime       = var.aws_lambda_runtime
  lambda_output_path   = "github-webhook.lambda.zip"

  route_key             = var.gh_webhook_route_key
  s3_bucket             = var.lambdas_s3_bucket
  sqs_queue_arn         = module.github_queue.queue_arn
  sqs_queue_url         = module.github_queue.queue_url
  github_webhook_secret = var.github_webhook_secret

  depends_on = [module.apigateway, module.github_queue]
}

module "github_consumer" {
  source = "./modules/aws/github/consumer"

  dynamodb_table_name = module.dynamodb.table_name

  github_app_id          = var.github_app_id
  github_app_private_key = var.github_app_private_key

  lambda_function_name = var.gh_consumer_lambda_name
  lambda_handler       = var.aws_lambda_handler
  lambda_runtime       = var.aws_lambda_runtime
  lambda_output_path   = "github-sqs-consumer.lambda.zip"

  sqs_queue_url = module.github_queue.queue_url
  sqs_queue_arn = module.github_queue.queue_arn

  s3_bucket = var.lambdas_s3_bucket

  depends_on = [module.dynamodb, module.github_queue]
}
