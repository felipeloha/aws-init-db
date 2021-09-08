const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');
const rds = require('@aws-cdk/aws-rds');
const secretsmanager = require('@aws-cdk/aws-secretsmanager');
const cr = require('@aws-cdk/custom-resources');
const iam = require('@aws-cdk/aws-iam');
const logs = require('@aws-cdk/aws-logs');
const lambda = require('@aws-cdk/aws-lambda');
const path = require('path');

class AwsInitDbStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'vpc', { isDefault: true });
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'dbSecurityGroup', {
        vpc,
        securityGroupName: `stack-db-sg`,
        description: 'Enable HTTP access via port 5432',
    });
    cdk.Tags.of(dbSecurityGroup).add('Name', `my-stack-db-sg`);

    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_12_2 }),
        parameters: {
            log_statement: 'all',
            log_min_duration_statement: '1',
            max_wal_size: '1024',
            wal_compression: '1',
            wal_keep_segments: '8',
        },
    });

    const dbCredentials = secretsmanager.Secret.fromSecretNameV2(this, 'DBSecret', 'database-credentials-test');

    const database = new rds.DatabaseInstance(this, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_12_5 }),
        instanceType: 't2.micro',
        vpc,
        instanceIdentifier: `my-stack-db`,
        allocatedStorage: 5,
        allowMajorVersionUpgrade: true,
        databaseName: 'my_stack_database',
        parameterGroup: parameterGroup,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        backupRetention: cdk.Duration.days(1),
        securityGroups: [dbSecurityGroup],
        vpcSubnets: {
            subnetType: ec2.SubnetType.PUBLIC,
        },
        publiclyAccessible: false,
        credentials: rds.Credentials.fromSecret(dbCredentials),
    });

    cdk.Tags.of(database).add('Name', `my-stack-db`);

    initDatabase(this, database, dbSecurityGroup, vpc);
  }
}

module.exports = { AwsInitDbStack }


function initDatabase(
  stack,
  database,
  dbSecurityGroup,
  vpc,
) {
  const lambdaRole = new iam.Role(stack, 'initDBLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  });
  lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(
          stack,
          'lambdavpcaccesspolicy',
          'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
      ),
  );
  lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
  lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')); //TODO !!!

  const initDBSecurityGroup = new ec2.SecurityGroup(stack, 'initDBSecurityGroup', {
      vpc,
      securityGroupName: `stack-init-db-sg`,
      description: 'Enable HTTP access via port 5432',
  });
  cdk.Tags.of(dbSecurityGroup).add('Name', `my-stack-init-db-sg`);

  const onEvent = new lambda.Function(stack, 'InitDBHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      vpc,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      handler: 'index.handler',
      logRetention: logs.RetentionDays.ONE_DAY,
      timeout: cdk.Duration.minutes(5),
      role: lambdaRole,
      securityGroups: [initDBSecurityGroup],
      allowPublicSubnet: true,
  });

  const role = new iam.Role(stack, 'initDBRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  });
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));

  const provider = new cr.Provider(stack, 'dbInitProvider', {
      onEventHandler: onEvent,
      logRetention: logs.RetentionDays.ONE_DAY,
      role, // must be assumable by the `lambda.amazonaws.com` service principal
  });

  const dbInit = new cdk.CustomResource(stack, 'databaseInit', {
      serviceToken: provider.serviceToken,
      properties: {
          host: database.dbInstanceEndpointAddress,
          hostIntegrator: database.dbInstanceEndpointAddress,
          //random: `${Math.random()}`, //help to trigger event every time
      },
  });
  dbInit.node.addDependency(database);
  dbSecurityGroup.connections.allowFrom(
      onEvent,
      ec2.Port.tcp(5432),
      `my stack lambda intidb ingress 5432`,
  );
}