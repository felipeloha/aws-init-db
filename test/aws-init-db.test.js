const { expect, matchTemplate, haveResource } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const AwsInitDb = require('../lib/aws-init-db-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AwsInitDb.AwsInitDbStack(app, 'MyTestStack', 
    {
      stackName: 'test-stack',
        env: {
            account: '12345',
            region: 'eu-central-1',
        },
    });
    // THEN
    expect(stack).to(haveResource('AWS::EC2::SecurityGroup', {}));
});
