# IAM role for Lambda execution
resource "aws_iam_role" "lambda_exec" {
  name = "${var.lambda_function_name}-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach basic execution policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda execution role policies
resource "aws_iam_role_policy" "lambda_access" {
  name = "${var.lambda_function_name}-access"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "AllowS3AccessToLambdasBucket",
        Effect = "Allow",
        Action = [
          "s3:GetObject"
        ],
        Resource = [
          "arn:aws:s3:::${var.s3_bucket}/*"
        ]
      },
      {
        Sid    = "AllowSQSSendMessageToGitHubWebhookQueue",
        Effect = "Allow",
        Action = [
          "sqs:SendMessage"
        ],
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../../apps/api/src/github/github-webhook"
  output_path = "${path.module}/../../../../../apps/api/src/github/github-webhook.lambda.zip"
}

resource "aws_s3_object" "lambda" {
  bucket = var.s3_bucket

  key    = "github-webhook.lambda.zip"
  source = data.archive_file.lambda_zip.output_path

  etag = filemd5(data.archive_file.lambda_zip.output_path)
}

# Lambda function using S3 as source
resource "aws_lambda_function" "webhook_handler" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = var.lambda_handler

  s3_bucket = aws_s3_object.lambda.bucket
  s3_key    = aws_s3_object.lambda.key

  environment {
    variables = {
      GITHUB_WEBHOOK_SECRET = var.github_webhook_secret
      SQS_QUEUE_URL         = var.sqs_queue_url
    }
  }
}

# API Gateway integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# API Gateway route
resource "aws_apigatewayv2_route" "lambda_route" {
  api_id    = var.api_id
  route_key = var.route_key
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "apigateway_permission" {
  statement_id  = "AllowInvokeFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/*"
}

data "aws_caller_identity" "current" {}
