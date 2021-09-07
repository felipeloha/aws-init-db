#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { AwsInitDbStack } = require('../lib/aws-init-db-stack');

const app = new cdk.App();
new AwsInitDbStack(app, 'AwsInitDbStack', {
  stackName: process.env.STACK_NAME,
  env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
  },
});