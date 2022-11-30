import {Fn, TerraformOutput, TerraformStack} from 'cdktf';
import { Construct } from 'constructs';
import { MonozipAwsStackID, MonozipStacks } from '../constants/stacks';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import { ServiceDiscoveryService } from '../../.gen/providers/aws/service-discovery-service';
import { ServiceDiscovery } from '../constructs/service-discovery';
import { RabbitMq } from '../constructs/mq';
import * as config from '../../config.json';
import { CognitoAuth } from '../constructs/auth';

export class MonozipMiddlewareStack extends TerraformStack {
  private readonly mq: RabbitMq;
  private readonly auth: CognitoAuth;
  private readonly discoverService: ServiceDiscoveryService;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.MIDDLEWARE, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
    });

    const networkState = new MonozipRemoteState(
        this,
        MonozipAwsStackID.REMOTE_STATE_ID,
        MonozipStacks.NETWORK,
        config.Stage,
    );
    this.mq = new RabbitMq(this, 'MonozipDemoRabbitMq', {
      name: 'monozip-demo-rabbitmq',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_SUBNETS),
      ingressCidrBlocks: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_CIDRS),
      instanceType: 'mq.t3.micro',
    });

    const http = new ServiceDiscovery(this, 'HttpServiceDiscovery', {
      name: 'monozip-demo.http.srv',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
    });

    this.discoverService = http.addService('monozip-demo-api');

    this.auth = new CognitoAuth(this, 'CognitoAuth', {
      name: 'monozip-demo-user-pool',
      callbackUrls: config.CognitoAuthCallbackUrls,
      logoutUrls: config.CognitoAuthLogoutUrls,
      bucketName: config.CognitoAuthS3BucketName,
    });
  }

  public export() {
    const host = Fn.element(Fn.split( ":", this.mq.endpoint), 1)
    new TerraformOutput(this, MonozipAwsStackID.RABBITMQ_ENDPOINT, {
      value: Fn.substr(host, 2,  Fn.lengthOf(host)),
    });
    new TerraformOutput(this, MonozipAwsStackID.RABBITMQ_USERNAME, {
      value: this.mq.username,
      sensitive: true,
    });
    new TerraformOutput(this, MonozipAwsStackID.RABBITMQ_PORT, {
      value: this.mq.port,
    });
    new TerraformOutput(this, MonozipAwsStackID.RABBITMQ_PASSWORD, {
      value: this.mq.password,
      sensitive: true,
    });
    new TerraformOutput(this, 'MonozipDemoServiceDiscoveryServiceArn', {
      value: this.discoverService.arn,
    });
    new TerraformOutput(this, MonozipAwsStackID.COGNITO_USER_POOL_ID, {
      value: this.auth.userPoolId,
    });
    new TerraformOutput(this, 'CognitoLambdaTriggerRoleId', {
      value: this.auth.roleArn,
    }).friendlyUniqueId;
    new TerraformOutput(this, 'CognitoLambdaTriggerBucket', {
      value: this.auth.bucketArn,
    });
    // new TerraformOutput(this, 'CognitoLambdaTriggerArn', {
    //   value: this.auth.fnArn,
    // });
  }
}
