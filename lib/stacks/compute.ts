import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { MonozipAwsStackID, MonozipStacks } from '../constants/stacks';
import { EcsContainer, EcsFargateService, EcsServiceCluster } from '../constructs/cluster';
import { ContainerRegistry, ContainerRepository } from '../constructs/registry';
import { FargateCognitoRole } from '../constructs/roles';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import * as config from "../../config.json";

export class MonozipImageRepoStack extends TerraformStack {
  private readonly registry: ContainerRegistry;
  private readonly monozipDemoRepo: ContainerRepository;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new MonozipRemoteBackend(this, MonozipStacks.IMAGE, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
    });



    this.registry = new ContainerRegistry(this, 'ContainerRegistry', {
      namespace: 'monozip-demo',
    });

    this.monozipDemoRepo = this.registry.addRepository('monozip-demo-api');
  }

  public export() {
    new TerraformOutput(this, 'MonzipDemoImageRepoUrl', {
      value: this.monozipDemoRepo.getRepositoryUrl(),
    });
  }
}

export class MonozipComputeStack extends TerraformStack {
  private readonly registry: ContainerRegistry;
  private readonly monozipDemoApi: EcsFargateService;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.COMPUTE, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
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

    // todo
    const monozipDemoApiContainer = new EcsContainer(this, 'MonozipDemoApiContainer', {
      name: 'monozip-demo-api',
      imageUri: monozipDemoRepo.getImageUrl('latest'),
      port: config.ServicePort,
      taskRoleArn: taskRole.roleArn,
    });

    this.monozipDemoApi = cluster.addPublicService(
        monozipDemoApiContainer,
      1,
      gatewayState.getString('MonozipDemoApiTargetGroupArn'),
      middlewareState.getString('MonozipDemoServiceDiscoveryServiceArn'),
    );
  }

  public export() {
    new TerraformOutput(this, 'EcrRegistryUrl', {
      value: this.registry.registryUrl,
    });

    new TerraformOutput(this, 'MonzipDemoApiPort', {
      value: this.monozipDemoApi.port,
    });
  }
}
