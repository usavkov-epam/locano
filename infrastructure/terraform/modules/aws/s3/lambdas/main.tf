resource "aws_s3_bucket" "lambdas_bucket" {
  bucket = var.bucket_name
}

# Policies
resource "aws_s3_bucket_policy" "lambdas_bucket_policy" {
  bucket = aws_s3_bucket.lambdas_bucket.id
  policy = data.aws_iam_policy_document.lambdas.json
}

data "aws_iam_policy_document" "lambdas" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      aws_s3_bucket.lambdas_bucket.arn,
      "${aws_s3_bucket.lambdas_bucket.arn}/*",
    ]

    principals {
      type        = "AWS"
      identifiers = [
        aws_caller_identity.current.arn,
      ]
    }
  }
}

data "aws_caller_identity" "current" {}
