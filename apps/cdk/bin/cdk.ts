#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LocanoCdkStack } from '../lib/cdk-stack';

const app = new cdk.App();
new LocanoCdkStack(app, 'LocanoStackCDK', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stackName: 'LocanoStackCDK',
  description: 'This stack includes resources needed to deploy AWS CDK Locano app into this environment',
});
