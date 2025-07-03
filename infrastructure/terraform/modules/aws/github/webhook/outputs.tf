output "lambda_function_name" {
  description = "Name of the deployed Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "lambda_arn" {
  description = "ARN of the deployed Lambda function"
  value       = aws_lambda_function.this.arn
}

output "lambda_source_code_hash" {
  description = "Source code hash of the Lambda function"
  value       = aws_lambda_function.this.source_code_hash
}

