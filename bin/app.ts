import { App } from 'cdktf';
import { MonozipNetworkStack } from '../lib/stacks/network';
import { MonozipStorageStack } from '../lib/stacks/storage';
import { MonozipMiddlewareStack } from '../lib/stacks/middleware';
import { MonozipComputeStack } from '../lib/stacks/compute';
import { MonozipGatewayStack } from '../lib/stacks/gateway';

export class Monozip extends App {
  constructor() {
    super();

    new MonozipNetworkStack(this, 'MonozipDemoNetworkStack').export();
    new MonozipStorageStack(this, 'MonozipDemoStorageStack').export();
    new MonozipMiddlewareStack(this, 'MonozipDemoMiddlewareStack').export();
    new MonozipComputeStack(this, 'MonozipComputeStack').export();
    new MonozipGatewayStack(this, 'MonozipGatewayStack');
  }
}
