import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { AwsRegion } from '../constants/aws';
import {MonozipAwsStackID, MonozipStacks} from '../constants/stacks';
import { Alb } from '../constructs/lb';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import * as config from "../../config.json";

export class MonozipGatewayStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.GATEWAY, config.Stage);

    new AwsProvider(this, 'AwsProvider', {
      region: AwsRegion.TOKYO,
    });

    const networkState = new MonozipRemoteState(this, 'MonozipNetworkRemoteState', MonozipStacks.NETWORK, config.Stage);

    const computeState = new MonozipRemoteState(this, 'MonozipComputeRemoteState', MonozipStacks.COMPUTE, config.Stage);

    const lb = new Alb(this, 'Vpc', {
      name: 'monozip-demo-lb',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PUBLIC_SUBNETS),
      ports: [443],
    });

    const listener = lb.addHttpsListener(config.LBHttpsListener);

    const monozipDemoTargetGroupArn = listener.addForwardRule(
      'monozip-demo',
      [
        '/postgres',
        '/postgres/*',
        '/opensearch',
        '/opensearch/*',
        '/rabbitmq',
        '/cognito',
        '/secrets',
        '/secrets/*',
      ],
      computeState.getNumber('MonzipDemoApiV2Port'),
      'HTTP',
      '/secrets',
    );

    new TerraformOutput(this, 'LbEndpointDomain', {
      value: lb.loadBalancerDomain,
    });

    new TerraformOutput(this, 'MonozipDemoApiTargetGroupArn', {
      value: monozipDemoTargetGroupArn,
    });
  }
}
