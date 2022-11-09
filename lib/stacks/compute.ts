import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { AwsRegion } from '../constants/aws';
import {MonozipAwsStackID, MonozipStacks} from '../constants/stacks';
import { EcsContainer, EcsFargateService, EcsServiceCluster } from '../constructs/cluster';
import { ContainerRegistry } from '../constructs/registry';
import { FargateCognitoRole } from '../constructs/roles';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import * as config from "../../config.json";

export class MonozipComputeStack extends TerraformStack {
  private readonly registry: ContainerRegistry;
  private readonly monozipDemoApiV2: EcsFargateService;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.COMPUTE, config.Stage);

    new AwsProvider(this, 'AwsProvider', {
      region: AwsRegion.TOKYO,
    });

    const networkState = new MonozipRemoteState(this, 'MonozipRemoteStateNetwork',
        MonozipStacks.NETWORK, config.Stage);
    const gatewayState = new MonozipRemoteState(this, 'MonozipRemoteStateGateway',
        MonozipStacks.GATEWAY, config.Stage);
    const middlewareState = new MonozipRemoteState(this, 'MonozipRemoteStateMiddleware',
        MonozipStacks.MIDDLEWARE, config.Stage);

    this.registry = new ContainerRegistry(this, 'ContainerRegistry', {
      namespace: 'monozip-demo',
    });

    const monozipDemoRepo = this.registry.addRepository('monozip-demo-api');

    const cluster = new EcsServiceCluster(this, 'EcsCluster', {
      name: 'monozip-demo-cluster',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_SUBNETS),
      publicCidrs: networkState.getList(MonozipAwsStackID.NETWORK_PUBLIC_CIDRS),
      privateCidrs: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_CIDRS),
    });

    const taskRole = new FargateCognitoRole(this, 'FargateCognitoRole', {
      userPoolId: middlewareState.getString('CognitoUserPoolId'),
    });

    const monozipDemoApiV2Container = new EcsContainer(this, 'MonozipDemoApiV2Container', {
      name: 'monozip-demo-api',
      imageUri: monozipDemoRepo.getImageUrl('latest'),
      port: 8087,
      taskRoleArn: taskRole.roleArn,
    });

    this.monozipDemoApiV2 = cluster.addPublicService(
        monozipDemoApiV2Container,
      1,
      gatewayState.getString('MonozipDemoApiTargetGroupArn'),
      middlewareState.getString('MonozipDemoServiceDiscoveryServiceArn'),
    );
  }

  public export() {
    new TerraformOutput(this, 'EcrRegistryUrl', {
      value: this.registry.registryUrl,
    });

    new TerraformOutput(this, 'MonzipDemoApiV2Port', {
      value: this.monozipDemoApiV2.port,
    });
  }
}
