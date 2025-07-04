output "lambda_function_name" {
  description = "Name of the deployed Lambda function"
  value       = aws_lambda_function.webhook_consumer.function_name
}

output "lambda_arn" {
  description = "ARN of the deployed Lambda function"
  value       = aws_lambda_function.webhook_consumer.arn
}
