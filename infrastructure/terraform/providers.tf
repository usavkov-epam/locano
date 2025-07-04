terraform { 
  cloud {} 
}

provider "aws" {
  region = var.aws_region
}

provider "archive" {}
