import { Fn } from 'cdktf';
import { Construct } from 'constructs';
import { CloudwatchLogGroup } from '../../.gen/providers/aws/cloudwatch-log-group';
import { DataAwsCallerIdentity } from '../../.gen/providers/aws/data-aws-caller-identity';
import { DataAwsRegion } from '../../.gen/providers/aws/data-aws-region';
import { EcsCluster } from '../../.gen/providers/aws/ecs-cluster';
import { EcsService } from '../../.gen/providers/aws/ecs-service';
import { EcsTaskDefinition } from '../../.gen/providers/aws/ecs-task-definition';
import { EcsContainerDefinition } from '../../.gen/modules/ecs-container-definition';
import { DataAwsIamPolicyDocument } from '../../.gen/providers/aws/data-aws-iam-policy-document';
import { IamRole } from '../../.gen/providers/aws/iam-role';
import { SecurityGroup } from '../../.gen/providers/aws/security-group';
import { AwsServicePrincipal } from '../constants/aws';

export interface EcsClusterProps {
  readonly name: string;
  readonly vpcId: string;
  readonly publicCidrs: string[];
  readonly privateCidrs: string[];
  readonly subnets: string[];
}

export class EcsServiceCluster extends Construct {
  private readonly cluster: EcsCluster;
  private readonly role: IamRole;
  private readonly vpcId: string;
  private readonly subnets: string[];
  private readonly publicCidrs: string[];
  private readonly privateCidrs: string[];

  constructor(scope: Construct, id: string, props: EcsClusterProps) {
    super(scope, id);
    this.vpcId = props.vpcId;
    this.subnets = props.subnets;
    this.publicCidrs = props.publicCidrs;
    this.privateCidrs = props.privateCidrs;

    this.cluster = new EcsCluster(this, 'ECSCluster', {
      name: props.name,
      setting: [{
        name: 'containerInsights',
        value: 'enabled',
      }],
    });

    this.role = new IamRole(this, 'ECSRole', {
      name: 'monozipDemoecsTaskExecutionRole',
      assumeRolePolicy: new DataAwsIamPolicyDocument(this, 'ECSRolePolicy', {
        version: '2012-10-17',
        statement: [{
          effect: 'Allow',
          principals: [{
            type: 'Service',
            identifiers: [AwsServicePrincipal.ECS_TASKS],
          }],
          actions: ['sts:AssumeRole'],
        }],
      }).json,
      managedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'],
    });
  }

  public addPublicService(container: EcsContainer, count: number, targetGroupArn?: string, discoveryServiceArn?: string): EcsFargateService {
    return new EcsFargateService(this, `ECSService-${container.containerName}`, {
      container: container,
      clusterId: this.cluster.id,
      desiredCount: count,
      vpcId: this.vpcId,
      subnets: this.subnets,
      ingressCidrBlocks: Fn.concat([this.publicCidrs, this.privateCidrs]),
      targetGroupArn: targetGroupArn,
      registryArn: discoveryServiceArn,
    });
  }

  public addInternalService(container: EcsContainer, count: number, discoveryServiceArn?: string): EcsFargateService {
    return new EcsFargateService(this, `ECSService-${container.containerName}`, {
      container: container,
      clusterId: this.cluster.id,
      desiredCount: count,
      vpcId: this.vpcId,
      subnets: this.subnets,
      ingressCidrBlocks: this.privateCidrs,
      registryArn: discoveryServiceArn,
    });
  }

  public get taskExecutionRoleArn(): string {
    return this.role.arn;
  }
}

export interface MountPoint {
  readonly containerPath: string;
  readonly sourceVolume: string;
  readonly readOnly?: boolean;
}

export interface EcsContainerProps {
  readonly name: string;
  readonly imageUri: string;
  readonly memory?: number;
  readonly cpu?: number;
  readonly port: number;
  readonly mountPoints?: MountPoint[];
  readonly environment?: { [key: string]: string };
  readonly secrets?: { [key: string]: string };
  readonly taskRoleArn?: string;
}

export class EcsContainer extends Construct {
  private readonly taskDef: EcsTaskDefinition;
  private readonly port: number;
  private readonly name: string;

  constructor(scope: Construct, id: string, props: EcsContainerProps) {
    super(scope, id);
    this.port = props.port;
    this.name = props.name;

    const log = new CloudwatchLogGroup(this, 'ECSLog', {
      name: `/aws/ecs/${props.name}`,
      retentionInDays: 90,
    });

    const region = new DataAwsRegion(this, 'AwsRegion').name;
    const container = new EcsContainerDefinition(this, 'ECSContainer', {
      containerName: props.name,
      containerImage: props.imageUri,
      essential: true,
      mapEnvironment: props.environment,
      mapSecrets: props.secrets,
      portMappings: [{
        protocol: 'tcp',
        containerPort: props.port,
        hostPort: props.port,
      }],

      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': log.name,
          'awslogs-region': region,
          'awslogs-stream-prefix': props.name,
        },
      },
    });

    const callerIdentity = new DataAwsCallerIdentity(this, 'DataAwsCallerIdentity');
    this.taskDef = new EcsTaskDefinition(this, 'ECSTaskDefinition', {
      family: props.name,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: props.cpu ? props.cpu.toString() : '256',
      memory: props.memory ? props.memory.toString() : '512',
      executionRoleArn: `arn:aws:iam::${callerIdentity.accountId}:role/monozipDemoecsTaskExecutionRole`,
      containerDefinitions: container.jsonMapEncodedListOutput,
      taskRoleArn: props.taskRoleArn,
    });
  }

  public get taskDefinitionArn(): string {
    return this.taskDef.arn;
  }

  public get containerPort(): number {
    return this.port;
  }

  public get containerName(): string {
    return this.name;
  }
}

export interface EcsServiceProps {
  readonly clusterId: string;
  readonly container: EcsContainer;
  readonly vpcId: string;
  readonly subnets: string[];
  readonly ingressCidrBlocks: string[];
  readonly desiredCount: number;
  readonly targetGroupArn?: string;
  readonly registryArn?: string;
}

export class EcsFargateService extends Construct {
  private readonly _port: number;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);
    this._port = props.container.containerPort;

    const ecsSecurityGroup = new SecurityGroup(this, 'ECSSecurityGroup', {
      name: `${props.container.containerName}-sg`,
      vpcId: props.vpcId,
      ingress: [{
        fromPort: this._port,
        toPort: this._port,
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

    new EcsService(this, 'ECSService', {
      name: props.container.containerName,
      cluster: props.clusterId,
      taskDefinition: props.container.taskDefinitionArn,
      desiredCount: props.desiredCount,
      launchType: 'FARGATE',
      deploymentMaximumPercent: 200,
      deploymentMinimumHealthyPercent: 50,
      healthCheckGracePeriodSeconds: 0,
      networkConfiguration: {
        subnets: props.subnets,
        securityGroups: [ecsSecurityGroup.id],
        assignPublicIp: false,
      },
      loadBalancer: props.targetGroupArn != undefined ? [{
        targetGroupArn: props.targetGroupArn,
        containerName: props.container.containerName,
        containerPort: props.container.containerPort,
      }] : undefined,
      serviceRegistries: props.registryArn != undefined ? {
        registryArn: props.registryArn,
        port: props.container.containerPort,
      } : undefined,
      schedulingStrategy: 'REPLICA',
      propagateTags: 'SERVICE',
      forceNewDeployment: true,
    });
  }

  public get port(): number {
    return this._port;
  }
}

