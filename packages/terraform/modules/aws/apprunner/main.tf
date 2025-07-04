resource "aws_ecr_repository" "locano_api" {
  name = var.ecr_repo_name
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.service_name}-apprunner-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_apprunner_service" "locano_api" {
  service_name = var.service_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.locano_api.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = var.service_port
      }
    }
  }
}
