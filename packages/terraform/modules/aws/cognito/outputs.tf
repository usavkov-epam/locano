output "user_pool_id" {
  value = aws_cognito_user_pool.locano_user_pool.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.locano_user_pool_client.id
}
