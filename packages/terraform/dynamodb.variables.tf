variable "dynamodb_table_name_configs" {
  description = "Name of the DynamoDB table for configurations"
  type        = string
  nullable    = false
}

variable "dynamodb_table_name_translations" {
  description = "Name of the DynamoDB table for translations"
  type        = string
  nullable    = false
}
