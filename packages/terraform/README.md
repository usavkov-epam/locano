# ☁️ Locano Infrastructure — Terraform

This directory contains Terraform code to provision **Locano's AWS infrastructure**, using:

- Terraform Cloud (TFC) for remote backend and execution
- AWS as the cloud provider
- Secure OIDC-based assume-role access (no AWS access keys)
- Modular architecture for clean infrastructure separation

---

## 📦 What It Provisions

- DynamoDB table (on-demand billing) for localization data
- (Optional) App Runner + ECR service for backend deployment
- SSM Parameter Store for managing secrets like API keys

---

## 🌩️ Terraform Cloud Configuration via Environment Variables

Terraform Cloud is used to store state and execute plans/applies.  
No `terraform { cloud {} }` block is required — instead, use these **environment variables**:

| Variable Name               | Description                              |
|----------------------------|------------------------------------------|
| `TF_CLOUD_ORGANIZATION`    | Your Terraform Cloud organization        |
| `TF_WORKSPACE`             | Target workspace (e.g. `locano-dev`)     |
| `TF_TOKEN_app_terraform_io`| Terraform Cloud CLI token (user-level)   |

> Create the token in Terraform Cloud → **User Settings → Tokens**

### 🧪 Example usage:

```bash
export TF_CLOUD_ORGANIZATION=usavkov_org
export TF_WORKSPACE=locano-dev
export TF_TOKEN_app_terraform_io=<your_token>

terraform init
terraform plan
terraform apply
````

---

## 🔐 AWS Access via OIDC Assume Role (Including Terraform Cloud Integration)

Terraform Cloud authenticates into AWS by assuming an IAM role via OpenID Connect (OIDC), **without using static credentials**.

Guide: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/dynamic-provider-credentials/aws-configuration

### 1. IAM Role Trust Policy (example)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/app.terraform.io"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "app.terraform.io:sub": "organization:usavkov_org:workspace:locano-dev"
        }
      }
    }
  ]
}
```

Attach appropriate permissions (e.g. `AdministratorAccess` for development/testing).

---

### 2. Required Terraform Cloud Workspace Environment Variables

| Name                    | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `TFC_AWS_PROVIDER_AUTH` | Enables automatic OIDC-based AWS authentication (must be `true`) |
| `TFC_AWS_RUN_ROLE_ARN`  | IAM Role ARN to assume in AWS                                    |

> `AWS_ROLE_ARN` can also be used as an alternative to `TFC_AWS_RUN_ROLE_ARN`.

---

## ✅ Summary of Required ENV Variables

| Variable                    | Set In         | Purpose                              |
| --------------------------- | -------------- | ------------------------------------ |
| `TF_CLOUD_ORGANIZATION`     | Local/CI Shell | Points to your Terraform Cloud org   |
| `TF_WORKSPACE`              | Local/CI Shell | Selects the target workspace         |
| `TF_TOKEN_app_terraform_io` | Local/CI Shell | Authenticates Terraform CLI with TFC |
| `TFC_AWS_PROVIDER_AUTH`     | TFC Workspace  | Enables AWS OIDC assume-role         |
| `TFC_AWS_RUN_ROLE_ARN`      | TFC Workspace  | Specifies which IAM Role to assume   |

---

## 🚀 Deployment Instructions

1. Ensure all required environment variables are set
2. Navigate to the `infrastructure/terraform/` directory
3. Run:

```bash
terraform init
terraform plan
terraform apply
```

Plan and apply operations will be executed remotely in Terraform Cloud, and streamed to your terminal.

---

## 📤 Terraform Outputs

| Output Name             | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `dynamodb_table_name`   | Name of the created DynamoDB table                |
| `apprunner_service_url` | Public URL of the App Runner service (if enabled) |
| `ssm_parameter_name`    | Name of the created SSM parameter                 |

---
