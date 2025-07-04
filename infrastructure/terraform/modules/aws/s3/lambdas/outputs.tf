output "s3_bucket_name" {
  description = "Name of the S3 bucket that stores Lambda functions"
  value = aws_s3_bucket.lambdas_bucket.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket that stores Lambda functions"
  value = aws_s3_bucket.lambdas_bucket.arn
}

output "s3_bucket_id" {
  description = "ID of the S3 bucket that stores Lambda functions"
  value = aws_s3_bucket.lambdas_bucket.id
}