resource "aws_iam_role" "lambda_exec" {
  name = "${var.lambda_function_name}-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "this" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = var.lambda_handler

  filename         = "${dirname(var.lambda_dir)}/${var.lambda_output_path}"
  source_code_hash = filebase64sha256("${dirname(var.lambda_dir)}/${var.lambda_output_path}")
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.this.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "lambda_route" {
  api_id    = var.api_id
  route_key = var.route_key
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "apigateway_permission" {
  statement_id  = "AllowInvokeFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:*:*:${var.api_id}/*/${split(" ", var.route_key)[0]}${split(" ", var.route_key)[1]}"
}
