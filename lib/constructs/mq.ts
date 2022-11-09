import { Fn } from 'cdktf';
import { Construct } from 'constructs';
import { MqBroker } from '../../.gen/providers/aws/mq-broker';
import { SecurityGroup } from '../../.gen/providers/aws/security-group';
import { Password } from '../../.gen/providers/random/password';
import { RandomProvider } from '../../.gen/providers/random/provider';

export interface MessageQueueProps {
  name: string;
  vpcId: string;
  subnets: string[];
  ingressCidrBlocks: string[];
  instanceType: string;
}

export class RabbitMq extends Construct {
  private readonly mq: MqBroker;
  private readonly mqPassword: Password;

  constructor(scope: Construct, id: string, props: MessageQueueProps) {
    super(scope, id);

    new RandomProvider(this, 'RandomProvider');

    const sg = new SecurityGroup(this, 'SecurityGroup', {
      vpcId: props.vpcId,
      name: 'mq-broker-sg',
      description: 'Security group for the message queue',
      ingress: [{
        protocol: 'tcp',
        fromPort: 5671,
        toPort: 5671,
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

    this.mqPassword = new Password(this, 'Password', {
      length: 16,
      special: false,
    });
    this.mq = new MqBroker(this, 'MqBroker', {
      brokerName: props.name,
      engineType: 'RabbitMQ',
      engineVersion: '3.9.16',
      autoMinorVersionUpgrade: true,
      hostInstanceType: props.instanceType,
      subnetIds: [Fn.element(props.subnets, 0)],
      securityGroups: [sg.id],
      publiclyAccessible: false,
      deploymentMode: 'SINGLE_INSTANCE',
      user: [{
        consoleAccess: true,
        username: 'admin',
        password: this.mqPassword.result,
      }],
      maintenanceWindowStartTime: {
        dayOfWeek: 'SUNDAY',
        timeOfDay: '02:00',
        timeZone: 'Asia/Tokyo',
      },
      logs: {
        general: true,
      },
    });
  }

  public get endpoint(): string {
    return Fn.element(this.mq.instances.get(0).endpoints, 0);
  }

  public get username(): string {
    return 'admin';
  }

  public get password(): string {
    return this.mqPassword.result;
  }
}
