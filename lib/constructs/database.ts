import { Fn, Token } from 'cdktf';
import { Construct } from 'constructs';
import { Rds } from '../../.gen/modules/rds';
import { OpensearchDomain } from '../../.gen/providers/aws/opensearch-domain';
import { CloudwatchLogGroup } from '../../.gen/providers/aws/cloudwatch-log-group';
import { CloudwatchLogResourcePolicy } from '../../.gen/providers/aws/cloudwatch-log-resource-policy';
import { DataAwsRegion } from '../../.gen/providers/aws/data-aws-region';
import { DataAwsCallerIdentity } from '../../.gen/providers/aws/data-aws-caller-identity';
import { DataAwsIamPolicyDocument } from '../../.gen/providers/aws/data-aws-iam-policy-document';
import { IamServiceLinkedRole } from '../../.gen/providers/aws/iam-service-linked-role';
import { SecurityGroup } from '../../.gen/providers/aws/security-group';
import { Password } from '../../.gen/providers/random/password';
import { RandomProvider } from '../../.gen/providers/random/provider';
import { AwsServicePrincipal } from '../constants/aws';

export interface RelationalDatabaseProps {
  readonly name: string;
  readonly vpcId: string;
  readonly subnets: string[];
  readonly ingressCidrBlocks: string[];
  readonly databaseName: string;
  readonly deletionProtection: boolean;
}

export class PostgresDatabase extends Construct {
  private readonly rds: Rds;

  constructor(scope: Construct, id: string, props: RelationalDatabaseProps) {
    super(scope, id);

    const databaseSecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
      name: `${props.name}-sg`,
      vpcId: props.vpcId,
      ingress: [{
        fromPort: 5432,
        toPort: 5432,
        protocol: 'tcp',
        cidrBlocks: props.ingressCidrBlocks,
      }],
      egress: [{
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        ipv6CidrBlocks: ['::/0'],
      }],
    });

    this.rds = new Rds(this, 'Rds', {
      identifier: props.name,
      engine: 'postgres',
      engineVersion: '12.8',
      majorEngineVersion: '12',
      port: '5432',
      createDbParameterGroup: false,
      createDbOptionGroup: false,
      createMonitoringRole: true,
      createRandomPassword: true,
      performanceInsightsEnabled: true,
      name: props.databaseName,
      username: 'monozip',
      instanceClass: 'db.t2.small',
      allocatedStorage: '20',
      maxAllocatedStorage: 100,
      multiAz: true,
      iamDatabaseAuthenticationEnabled: true,
      deletionProtection: false, // todo
      // deletionProtection: props.deletionProtection, // todo
      subnetIds: props.subnets,
      maintenanceWindow: 'Sat:13:15-Sat:13:45',
      backupWindow: '14:00-14:30',
      publiclyAccessible: false,
      vpcSecurityGroupIds: [databaseSecurityGroup.id],
      storageEncrypted: false,
      createDbSubnetGroup: true,
      monitoringRoleName: 'monozip-demo-monitor-role'
    });
  }

  public get endpoint(): string {
    return Token.asString(this.rds.dbInstanceEndpointOutput);
  }

  public get username(): string {
    return Token.asString(this.rds.dbInstanceUsernameOutput);
  }

  public get password(): string {
    return Token.asString(this.rds.dbInstancePasswordOutput);
  }

  public get port(): string {
    return Token.asString(this.rds.port);
  }

  public get dbName(): string {
    return Token.asString(this.rds.name);
  }
}

export interface SearchDatabaseProps {
  readonly name: string;
  readonly instanceType: string;
  readonly vpcId: string;
  readonly ingressCidrBlocks: string[];
  readonly subnets: string[];
}

export class ElasticSearchDatabase extends Construct {
  private readonly domain: OpensearchDomain;

  constructor(scope: Construct, id: string, props: SearchDatabaseProps) {
    super(scope, id);

    new RandomProvider(this, 'RandomProvider');

    const linkRole = new IamServiceLinkedRole(this, 'EsDemoServiceLinkedRole', {
      awsServiceName: AwsServicePrincipal.OPENSEARCH_SERVICE,
    });

    const slowLog = new CloudwatchLogGroup(this, 'CloudwatchLogGroupSlow', {
      name: `/aws/opensearch/${props.name}/slow`,
      retentionInDays: 90,
    });
    const auditLog = new CloudwatchLogGroup(this, 'CloudwatchLogGroupAudit', {
      name: `/aws/opensearch/${props.name}/audit`,
      retentionInDays: 90,
    });

    const resourcePolicy = new DataAwsIamPolicyDocument(this, 'LogResourceAccessPolicy', {
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        principals: [{
          type: 'Service',
          identifiers: [AwsServicePrincipal.ES],
        }],
        actions: [
          'logs:PutLogEvents',
          'logs:PutLogEventsBatch',
          'logs:CreateLogStream',
        ],
        resources: [`${slowLog.arn}:*`, `${auditLog.arn}:*`],
      }],
    });
    new CloudwatchLogResourcePolicy(this, 'ECSLogPolicy', {
      policyDocument: resourcePolicy.json,
      policyName: 'ECSLogPolicy',
    });

    const opensearchSecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
      name: `${props.name}-sg`,
      vpcId: props.vpcId,
      ingress: [{
        fromPort: 443,
        toPort: 443,
        protocol: 'tcp',
        cidrBlocks: props.ingressCidrBlocks,
      }],
      egress: [{
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        ipv6CidrBlocks: ['::/0'],
      }],
    });

    const accountId = new DataAwsCallerIdentity(this, 'AwsCallerIdentity').accountId;
    const region = new DataAwsRegion(this, 'AwsRegion').name;
    const accessPolicy = new DataAwsIamPolicyDocument(this, 'AccessPolicy', {
      version: '2012-10-17',
      statement: [
        {
          actions: ['es:*'],
          principals: [{
            type: '*',
            identifiers: ['*'],
          }],
          effect: 'Allow',
          resources: [`arn:aws:es:${region}:${accountId}:domain/${props.name}/*`],
        },
      ],
    });

    const masterPassword = new Password(this, 'Password', {
      length: 16,
    });

    this.domain = new OpensearchDomain(this, 'OpensearchDomain', {
      domainName: props.name,
      engineVersion: 'OpenSearch_1.2',
      clusterConfig: {
        instanceType: props.instanceType,
        instanceCount: 1,
        zoneAwarenessEnabled: false,
      },
      vpcOptions: {
        subnetIds: [Fn.element(props.subnets, 0)],
        securityGroupIds: [opensearchSecurityGroup.id],
      },
      accessPolicies: accessPolicy.json,
      logPublishingOptions: [
        {
          cloudwatchLogGroupArn: slowLog.arn,
          enabled: true,
          logType: 'INDEX_SLOW_LOGS',
        },
        {
          cloudwatchLogGroupArn: slowLog.arn,
          enabled: true,
          logType: 'SEARCH_SLOW_LOGS',
        },
        {
          cloudwatchLogGroupArn: auditLog.arn,
          enabled: true,
          logType: 'ES_APPLICATION_LOGS',
        },
        {
          cloudwatchLogGroupArn: auditLog.arn,
          enabled: true,
          logType: 'AUDIT_LOGS',
        },
      ],
      advancedSecurityOptions: {
        internalUserDatabaseEnabled: true,
        enabled: true,
        masterUserOptions: {
          masterUserName: 'admin',
          masterUserPassword: masterPassword.result,
        },
      },
      domainEndpointOptions: {
        enforceHttps: true,
        tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07',
      },
      encryptAtRest: {
        enabled: true,
      },
      nodeToNodeEncryption: {
        enabled: true,
      },
      ebsOptions: {
        ebsEnabled: true,
        volumeType: 'gp2',
        volumeSize: 10,
      },
      dependsOn: [linkRole],
    });
  }

  public get domainEndpoint(): string {
    return Token.asString(this.domain.endpoint);
  }

  public get domainPort(): number {
    return 443;
  }

  public get domainMasterUsername(): string {
    return Token.asString(this.domain.advancedSecurityOptions.masterUserOptions.masterUserName);
  }

  public get domainMasterPassword(): string {
    return Token.asString(this.domain.advancedSecurityOptions.masterUserOptions.masterUserPassword);
  }
}
