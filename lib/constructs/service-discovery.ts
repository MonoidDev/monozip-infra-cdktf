import { Construct } from 'constructs';
import { ServiceDiscoveryPrivateDnsNamespace } from '../../.gen/providers/aws/service-discovery-private-dns-namespace';
import { ServiceDiscoveryService } from '../../.gen/providers/aws/service-discovery-service';

export interface ServiceDiscoveryProps {
  name: string;
  vpcId: string;
}

export class ServiceDiscovery extends Construct {
  private readonly namespace: ServiceDiscoveryPrivateDnsNamespace;

  constructor(scope: Construct, id: string, props: ServiceDiscoveryProps) {
    super(scope, id);

    this.namespace = new ServiceDiscoveryPrivateDnsNamespace(this, 'ServiceDiscoveryPrivateDnsNamespace', {
      name: props.name,
      vpc: props.vpcId,
    });
  }

  public addService(name: string): ServiceDiscoveryService {
    return new ServiceDiscoveryService(this, `ServiceDiscoveryService-${name}`, {
      name: name,
      dnsConfig: {
        dnsRecords: [
          {
            ttl: 60,
            type: 'SRV',
          },
        ],
        namespaceId: this.namespace.id,
        routingPolicy: 'MULTIVALUE',
      },
    });
  }
}
