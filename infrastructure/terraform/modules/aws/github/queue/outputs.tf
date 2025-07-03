output "queue_url" {
  value = aws_sqs_queue.github_webhook.id
}

output "queue_arn" {
  value = aws_sqs_queue.github_webhook.arn
}
