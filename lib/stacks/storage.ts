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
      deletionProtection: config.RDSDeletionProtection,
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
    new TerraformOutput(this, MonozipAwsStackID.POSTGRES_DATABASE_ENDPOINT, {
      value: this.monozipDemoPg.endpoint,
    });
    new TerraformOutput(this, MonozipAwsStackID.POSTGRES_DATABASE_USERNAME, {
      value: this.monozipDemoPg.username,
      sensitive: true,
    });
    new TerraformOutput(this, MonozipAwsStackID.POSTGRES_DATABASE_PASSWORD, {
      value: this.monozipDemoPg.password,
      sensitive: true,
    });
    new TerraformOutput(this, MonozipAwsStackID.POSTGRES_DATABASE_PORT, {
      value: this.monozipDemoPg.port,
    });
    new TerraformOutput(this, MonozipAwsStackID.POSTGRES_DATABASE_DBNAME, {
      value: this.monozipDemoPg.dbName,
    });
    new TerraformOutput(this, MonozipAwsStackID.ELASTICSEARCH_DATABASE_ENDPOINT, {
      value: this.es.domainEndpoint,
    });
    new TerraformOutput(this, MonozipAwsStackID.ELASTICSEARCH_DATABASE_USERNAME, {
      value: this.es.domainMasterUsername,
      sensitive: true,
    });
    new TerraformOutput(this, MonozipAwsStackID.ELASTICSEARCH_DATABASE_PASSWORD, {
      value: this.es.domainMasterPassword,
      sensitive: true,
    });
  }
}
