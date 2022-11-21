import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { MonozipAwsStackID, MonozipStacks } from '../constants/stacks';
import { Alb } from '../constructs/lb';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import * as config from "../../config.json";

export class MonozipGatewayStack extends TerraformStack {
  private readonly monozipDemoTargetGroupArn: string;
  private readonly alb: Alb;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.GATEWAY, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
    });

    const networkState = new MonozipRemoteState(this, 'MonozipNetworkRemoteState', MonozipStacks.NETWORK, config.Stage);


    this.alb = new Alb(this, 'Vpc', {
      name: 'monozip-demo-lb',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PUBLIC_SUBNETS),
      ports: [443, 80],
    });

    const listener = this.alb.addHttpListener();
    // const listener = lb.addHttpsListener(config.LBHttpsListener);

    this.monozipDemoTargetGroupArn = listener.addForwardRule(
        'monozip-demo',
        [
          // '/postgres',
          // '/postgres/*',
          // '/opensearch',
          // '/opensearch/*',
          '/rabbitmq',
          // '/cognito',
          // '/secrets',
          // '/secrets/*',
        ],
        config.ServicePort,
        'HTTP',
        '/health',
    );

  }
  public export() {

    new TerraformOutput(this, 'LbEndpointDomain', {
      value: this.alb.loadBalancerDomain,
    });

    new TerraformOutput(this, 'MonozipDemoApiTargetGroupArn', {
      value:this.monozipDemoTargetGroupArn,
    });
  }
}
