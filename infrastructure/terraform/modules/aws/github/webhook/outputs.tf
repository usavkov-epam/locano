output "lambda_function_name" {
  description = "Name of the deployed Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "lambda_arn" {
  description = "ARN of the deployed Lambda function"
  value       = aws_lambda_function.this.arn
}
