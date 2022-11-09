import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { AwsProvider } from '../../.gen/providers/aws/provider';
import { MonozipAwsStackID, MonozipStacks } from '../constants/stacks';
import { ElasticSearchDatabase, PostgresDatabase } from '../constructs/database';
import { MonozipRemoteBackend, MonozipRemoteState } from '../constructs/state';
import * as config from "../../config.json";

export class MonozipStorageStack extends TerraformStack {
  private readonly monozipDemoPg: PostgresDatabase;
  private readonly es: ElasticSearchDatabase;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new MonozipRemoteBackend(this, MonozipStacks.STORAGE, config.Stage);

    new AwsProvider(this, MonozipAwsStackID.ID, {
      region: config.Region,
      accessKey: config.AccessKey,
      secretKey: config.SecretKey,
    });

    const networkState = new MonozipRemoteState(this, MonozipAwsStackID.REMOTE_STATE_ID, MonozipStacks.NETWORK, config.Stage);

    this.monozipDemoPg = new PostgresDatabase(this, 'monozipDemoPostgresDatabase', {
      name: 'monozip-demo-postgres',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_SUBNETS),
      ingressCidrBlocks: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_CIDRS),
      databaseName: 'monozip_demo',
    });

    this.es = new ElasticSearchDatabase(this, 'ElasticSearchDatabase', {
      name: 'monozip-demo-es',
      vpcId: networkState.getString(MonozipAwsStackID.VPC_ID),
      subnets: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_SUBNETS),
      ingressCidrBlocks: networkState.getList(MonozipAwsStackID.NETWORK_PRIVATE_CIDRS),
      instanceType: 't3.small.search',
    });
  }

  public export() {
    new TerraformOutput(this, 'PostgresDatabaseEndpoint', {
      value: this.monozipDemoPg.endpoint,
    });
    new TerraformOutput(this, 'PostgresDatabaseUsername', {
      value: this.monozipDemoPg.username,
      sensitive: true,
    });
    new TerraformOutput(this, 'PostgresDatabasePassword', {
      value: this.monozipDemoPg.password,
      sensitive: true,
    });
    new TerraformOutput(this, 'PostgresDatabasePort', {
      value: this.monozipDemoPg.port,
    });
    new TerraformOutput(this, 'PostgresDatabaseDbName', {
      value: this.monozipDemoPg.dbName,
    });
    new TerraformOutput(this, 'ElasticSearchDatabaseEndpoint', {
      value: this.es.domainEndpoint,
    });
    new TerraformOutput(this, 'ElasticSearchDatabaseUsername', {
      value: this.es.domainMasterUsername,
      sensitive: true,
    });
    new TerraformOutput(this, 'ElasticSearchDatabasePassword', {
      value: this.es.domainMasterPassword,
      sensitive: true,
    });
  }
}
