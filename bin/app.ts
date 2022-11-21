import { App } from 'cdktf';
import { MonozipNetworkStack } from '../lib/stacks/network';
import { MonozipStorageStack } from '../lib/stacks/storage';
import { MonozipMiddlewareStack } from '../lib/stacks/middleware';
import { MonozipComputeStack, MonozipImageRepoStack } from '../lib/stacks/compute';
import { MonozipGatewayStack } from '../lib/stacks/gateway';
import {MonozipSecretsManagerStack} from "../lib/stacks/secretsmanager";

export class Monozip extends App {
  constructor() {
    super();

    new MonozipNetworkStack(this, 'MonozipDemoNetworkStack').export();
    new MonozipStorageStack(this, 'MonozipDemoStorageStack').export();
    new MonozipMiddlewareStack(this, 'MonozipDemoMiddlewareStack').export();
    new MonozipGatewayStack(this, 'MonozipDemoGatewayStack').export();
    new MonozipImageRepoStack(this, 'MonozipDemoImageRepoStack');
    new MonozipSecretsManagerStack(this, 'MonozipDemoSecretsManagerStack');
    // todo upload a image
    new MonozipComputeStack(this, 'MonozipDemoComputeStack').export();
  }
}
