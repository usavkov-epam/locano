# modules/aws/github/queue/main.tf
resource "aws_sqs_queue" "github_webhook" {
  name                      = var.sqs_queue_name
  visibility_timeout_seconds = 300
  message_retention_seconds = 86400
}
