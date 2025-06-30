resource "aws_ssm_parameter" "api_key" {
  name  = var.parameter_name
  type  = "SecureString"
  value = var.parameter_value
}
