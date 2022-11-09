import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { MonozipAwsStackID, MonozipStacks } from '../constants/stacks';
import { MonozipRemoteBackend } from '../constructs/state';
import { AwsVpc } from '../constructs/vpc';
import * as config from "../../config.json";

export class MonozipNetworkStack extends TerraformStack {
  private readonly vpc: AwsVpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.NETWORK, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
    });

    this.vpc = new AwsVpc(this, 'Vpc', {
      name: 'monozip-demo-vpc',
      cidr: '10.2.0.0/16',
      publicSubnets: ['10.2.0.0/24', '10.2.16.0/24', '10.2.32.0/24'],
      privateSubnets: ['10.2.48.0/24', '10.2.64.0/24', '10.2.80.0/24'],
      databaseSubnets: ['10.2.96.0/24', '10.2.112.0/24', '10.2.128.0/24'],
    });
  }

  public export() {
    new TerraformOutput(this, MonozipAwsStackID.VPC_ID, {
      value: this.vpc.vpcId,
    });
    new TerraformOutput(this, MonozipAwsStackID.VPC_CIDR, {
      value: this.vpc.vpcCidr,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_PUBLIC_CIDRS, {
      value: this.vpc.publicSubnetCidrs,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_PUBLIC_SUBNETS, {
      value: this.vpc.publicSubnetIds,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_PRIVATE_CIDRS, {
      value: this.vpc.privateSubnetCidrs,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_PRIVATE_SUBNETS, {
      value: this.vpc.privateSubnetIds,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_DATABASE_CIDRS, {
      value: this.vpc.databaseSubnetCidrs,
    });
    new TerraformOutput(this, MonozipAwsStackID.NETWORK_DATABASE_SUBNETS, {
      value: this.vpc.databaseSubnetIds,
    });
  }
}
