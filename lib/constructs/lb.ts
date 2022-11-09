import { Construct } from 'constructs';
import { AcmCertificate } from '../../.gen/providers/aws/acm-certificate';
import { DataAwsElbServiceAccount } from '../../.gen/providers/aws/data-aws-elb-service-account';
import { Lb } from '../../.gen/providers/aws/lb';
import { LbListener } from '../../.gen/providers/aws/lb-listener';
import { LbListenerRule } from '../../.gen/providers/aws/lb-listener-rule';
import {  LbTargetGroup } from '../../.gen/providers/aws/lb-target-group';
import { DataAwsIamPolicyDocument } from '../../.gen/providers/aws/data-aws-iam-policy-document';
import { S3Bucket } from '../../.gen/providers/aws/s3-bucket';
import { S3BucketPolicy } from '../../.gen/providers/aws/s3-bucket-policy';
import { SecurityGroup } from '../../.gen/providers/aws/security-group';
import { AwsServicePrincipal } from '../constants/aws';

export interface LoadBalancerProps {
  readonly name: string;
  readonly vpcId: string;
  readonly subnets: string[];
  readonly ports: number[];
}

export class Alb extends Construct {
  private readonly lb: Lb;
  private readonly vpcId: string;

  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id);
    this.vpcId = props.vpcId;

    const logBucket = new S3Bucket(this, 'LogBucket', {
      bucketPrefix: `${props.name}-logs`,
      acl: 'log-delivery-write',
      serverSideEncryptionConfiguration: {
        rule: {
          applyServerSideEncryptionByDefault: { sseAlgorithm: 'AES256' },
        },
      },
    });
    const lbAccount = new DataAwsElbServiceAccount(this, 'DataAwsElbServiceAccount');
    const logPolicy = new DataAwsIamPolicyDocument(this, 'DataAwsIamPolicyDocumentLog', {
      policyId: 's3-log-lb-policy',
      statement: [
        {
          actions: ['s3:PutObject'],
          effect: 'Allow',
          principals: [
            { type: 'AWS', identifiers: [lbAccount.arn] },
            { type: 'Service', identifiers: [AwsServicePrincipal.DELIVERY_LOGS] },
          ],
          resources: [`${logBucket.arn}/*`],
        },
        {
          actions: ['s3:GetBucketAcl'],
          effect: 'Allow',
          principals: [
            { type: 'Service', identifiers: [AwsServicePrincipal.DELIVERY_LOGS] },
          ],
          resources: [logBucket.arn],
        },
      ],
    });

    new S3BucketPolicy(this, 'LogBucketPolicy', {
      bucket: logBucket.bucket,
      policy: logPolicy.json,
    });

    new SecurityGroup(this, 'SecurityGroup', {
      name: `${props.name}-sg`,
      vpcId: props.vpcId,
      ingress: props.ports.map(value => {
        return {
          fromPort: value,
          toPort: value,
          protocol: 'tcp',
          cidrBlocks: ['0.0.0.0/0'],
        };
      }),
      egress: [{
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        ipv6CidrBlocks: ['::/0'],
      }],
    });

    this.lb = new Lb(this, 'LoadBalancer', {
      name: props.name,
      internal: false,
      subnets: props.subnets,
      loadBalancerType: 'application',
      enableDeletionProtection: false,
      accessLogs: {
        bucket: logBucket.bucket,
        prefix: 'access-logs',
        enabled: true,
      },
    });
  }

  public get loadBalancerArn(): string {
    return this.lb.arn;
  }

  public get loadBalancerDomain(): string {
    return this.lb.dnsName;
  }

  public addHttpsListener(domain: string): HttpsListener {
    return new HttpsListener(this, 'HttpsListener', {
      lbArn: this.lb.arn,
      domain: domain,
      vpcId: this.vpcId,
    });
  }
}

interface HttpsListenerProps {
  readonly lbArn: string;
  readonly domain: string;
  readonly vpcId: string;
}

export class HttpsListener extends Construct {
  private readonly listener: LbListener;
  private readonly vpcId: string;

  constructor(scope: Construct, id: string, props: HttpsListenerProps) {
    super(scope, id);
    this.vpcId = props.vpcId;

    const cert = new AcmCertificate(this, 'AcmCertificate', {
      domainName: props.domain,
      validationMethod: 'DNS',
      lifecycle: {
        createBeforeDestroy: true,
      },
    });

    this.listener = new LbListener(this, 'LbListener', {
      loadBalancerArn: props.lbArn,
      port: 443,
      protocol: 'HTTPS',
      certificateArn: cert.arn,
      lifecycle: {
        ignoreChanges: ['default_action'],
      },
      defaultAction: [{
        fixedResponse: {
          statusCode: '503',
          contentType: 'text/plain',
        },
        type: 'fixed-response',
      }],
    });
  }

  public addForwardRule(name: string, paths: string[], forwardToPort: number, protocol?: string, healthCheckPath?: string): string {
    const tg = new LbTargetGroup(this, `LoadBalancerTargetGroup-${name}`, {
      name: name,
      vpcId: this.vpcId,
      port: forwardToPort,
      targetType: 'ip',
      protocol: protocol ?? 'HTTP',
      healthCheck: {
        port: forwardToPort.toString(),
        protocol: protocol ?? 'HTTP',
        path: healthCheckPath ?? '/health',
        healthyThreshold: 2,
        unhealthyThreshold: 2,
        interval: 10,
      },
    });

    new LbListenerRule(this, `LbListenerRule-${name}`, {
      listenerArn: this.listener.arn,
      action: [{
        type: 'forward',
        targetGroupArn: tg.arn,
      }],
      condition: [{
        pathPattern: { values: paths },
      }],
    });

    return tg.arn;
  }
}
