# Getting started
* create secret `database-credentials-test` with database password `testPassword`
* cdk deploy
* you will have an rds instance with two databases inside with the following extensions installed: pg_trgm, btree_gin

Beware that the custom resource to initialize the db is only triggered when the parameters change.

# Welcome to your CDK JavaScript project!

This is a blank project for JavaScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands

 * `npm run test`         perform the jest unit tests
 * `cdk deploy`           deploy this stack to your default AWS account/region
 * `cdk diff`             compare deployed stack with current state
 * `cdk synth`            emits the synthesized CloudFormation template
