import { Token } from 'cdktf';
import { Construct } from 'constructs';
import { Vpc } from '../../.gen/modules/vpc';
import { AwsAz } from '../constants/aws';

export interface AwsVpcProps {
  readonly name: string;
  readonly cidr: string;
  readonly publicSubnets: string[];
  readonly privateSubnets: string[];
  readonly databaseSubnets: string[];
}

export class AwsVpc extends Construct {
  private readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: AwsVpcProps) {
    super(scope, id);

    this.vpc = new Vpc(this, 'Vpc', {
      name: props.name,
      azs: [AwsAz.TOKYO_A, AwsAz.TOKYO_C, AwsAz.TOKYO_D],
      cidr: props.cidr,
      publicSubnets: props.publicSubnets,
      privateSubnets: props.privateSubnets,
      databaseSubnets: props.databaseSubnets,
      singleNatGateway: true,
      enableNatGateway: true,
      enableDnsHostnames: true,
      enableFlowLog: true,
      createFlowLogCloudwatchIamRole: true,
      createFlowLogCloudwatchLogGroup: true,
      dhcpOptionsDomainNameServers: ['AmazonProvidedDNS'],
    });
  }

  get vpcId(): string {
    return Token.asString(this.vpc.vpcIdOutput);
  }

  get vpcCidr(): string {
    return Token.asString(this.vpc.cidr);
  }

  get publicSubnetIds(): string[] {
    return Token.asList(this.vpc.publicSubnetsOutput);
  }

  get privateSubnetIds(): string[] {
    return Token.asList(this.vpc.privateSubnetsOutput);
  }

  get databaseSubnetIds(): string[] {
    return Token.asList(this.vpc.databaseSubnetsOutput);
  }

  get publicSubnetCidrs(): string[] {
    return Token.asList(this.vpc.publicSubnets);
  }

  get privateSubnetCidrs(): string[] {
    return Token.asList(this.vpc.privateSubnets);
  }

  get databaseSubnetCidrs(): string[] {
    return Token.asList(this.vpc.databaseSubnets);
  }

  get defaultSecurityGroupId(): string {
    return Token.asString(this.vpc.defaultSecurityGroupIdOutput);
  }
}
