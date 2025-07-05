import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import * as path from "path";

export class LocanoCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* IAM Roles */
    const ghWebhookLambdaRole = new iam.Role(
      this,
      "GitHubWebhookLambdaExecutionRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    const ghPushEventLambdaRole = new iam.Role(
      this,
      "GitHubPushEventLambdaExecutionRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    // SQS queue for GitHub Webhook events
    const webhookQueue = new sqs.Queue(this, "GitHubWebhookQueue", {
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
    });

    new cdk.CfnOutput(this, "GitHubWebhookQueueUrl", {
      value: webhookQueue.queueUrl,
      description: "URL of the SQS queue for GitHub Webhook events",
    });

    // Lambda for filtering GitHub Webhook events
    const githubWebhookLambda = new lambdaNodeJS.NodejsFunction(
      this,
      "GitHubWebhookLambda",
      {
        entry: path.resolve(
          __dirname,
          "../../api/src/lambdas/github-webhook/index.ts"
        ),
        handler: "handler",
        description: "Handles and filters GitHub Webhooks.",
        runtime: lambda.Runtime.NODEJS_LATEST,
        role: ghWebhookLambdaRole,
        environment: {
          GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
          QUEUE_URL: webhookQueue.queueUrl,
        },
        bundling: {
          externalModules: [
            '@aws-sdk/*',
            '@smithy/*'
          ],
        }
      }
    );

    // Lambda for processing GitHub Push events
    const githubPushConsumerLambda = new lambdaNodeJS.NodejsFunction(
      this,
      "GitHubPushConsumerLambda",
      {
        events: [
          new lambdaEventSources.SqsEventSource(webhookQueue, {
            batchSize: 10,
            maxBatchingWindow: cdk.Duration.seconds(30),
          }),
        ],
        entry: path.resolve(
          __dirname,
          "../../api/src//lambdas/github-sqs-consumer/index.ts"
        ),
        handler: "handler",
        description: "Handle \"push\" event from GitHub and update translations for locales.",
        runtime: lambda.Runtime.NODEJS_LATEST,
        role: ghPushEventLambdaRole,
        environment: {
          QUEUE_URL: webhookQueue.queueUrl,
          GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
          GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID!,
          GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET!,
        },
        bundling: {
          externalModules: [
            '@aws-sdk/*'
          ],
        }
      }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "LocanoApiGateway", {
      restApiName: "Locano API",
      deployOptions: {
        stageName: "dev",
      },
    });

    api.root
      .addResource("github")
      .addResource("webhook")
      .addMethod("POST", new apigateway.LambdaIntegration(githubWebhookLambda));

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "LocanoUserPool", {
      signInAliases: { email: true },
      selfSignUpEnabled: true,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "LocanoUserPoolClient",
      {
        userPool,
      }
    );

    /* Roles and policies bindings */
    ghWebhookLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [webhookQueue.queueArn],
        effect: iam.Effect.ALLOW,
      })
    );

    ghPushEventLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
        resources: [webhookQueue.queueArn],
        effect: iam.Effect.ALLOW,
      })
    );
  }
}
