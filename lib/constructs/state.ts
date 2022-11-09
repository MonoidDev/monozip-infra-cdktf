import { DataTerraformRemoteState, RemoteBackend } from 'cdktf';
import { Construct } from 'constructs';
import { MonozipStacks } from '../constants/stacks';

export class MonozipRemoteState extends DataTerraformRemoteState {
  constructor(scope: Construct, id: string, name: MonozipStacks, stage: string) {
    super(scope, id, {
      hostname: 'app.terraform.io',
      organization: `monozip-demo-${stage}`,
      workspaces: {
        name: `monozip-demo-${name}`,
      },
    });
  }
}

export class MonozipRemoteBackend extends RemoteBackend {
  constructor(scope: Construct, name: MonozipStacks, stage: string) {
    super(scope, {
      hostname: 'app.terraform.io',
      organization: `monozip-demo-${stage}`,
      workspaces: {
        name: `monozip-demo-${name}`,
      },
    });
  }
}
