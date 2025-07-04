# IAM role for Lambda execution 
resource "aws_iam_role" "lambda_exec" {
  name = "${var.lambda_function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      },
    ]
  })
}

# Attach basic execution policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach basic execution policy to Lambda role
resource "aws_iam_role_policy" "sqs_consume" {
  name = "${var.lambda_function_name}-sqs-policy"
  role = aws_iam_role.lambda_exec.name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

# Data source to get S3 object metadata
data "aws_s3_object" "lambda_zip" {
  bucket = var.s3_bucket
  key    = var.lambda_output_path
}

# Lambda function using S3 as source
resource "aws_lambda_function" "webhook_consumer" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = var.lambda_handler

  s3_bucket        = var.s3_bucket
  s3_key           = var.lambda_output_path
  source_code_hash = data.aws_s3_object.lambda_zip.etag

  environment {
    variables = {
      DYNAMODB_TABLE         = var.dynamodb_table_name
      GITHUB_APP_ID          = var.github_app_id
      GITHUB_APP_PRIVATE_KEY = var.github_app_private_key
      SQS_QUEUE_URL          = var.sqs_queue_url
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.webhook_consumer.arn
  batch_size       = 1
}
