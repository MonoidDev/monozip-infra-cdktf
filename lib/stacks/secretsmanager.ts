import {TerraformStack} from 'cdktf';
import {Construct} from 'constructs';
import {AwsProvider} from '../../.gen/providers/aws/provider';
import {MonozipAwsStackID, MonozipStacks} from '../constants/stacks';
import {MonozipRemoteBackend, MonozipRemoteState} from '../constructs/state';
import * as config from '../../config.json';
import {SecretsManager} from "../constructs/secretsmanager";

export class MonozipSecretsManagerStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        new MonozipRemoteBackend(this, MonozipStacks.SECRETS_MANAGER, config.Stage);

        const storage = new MonozipRemoteState(this, 'MonozipRemoteStateStorage',
            MonozipStacks.STORAGE, config.Stage);

        const middleware = new MonozipRemoteState(this, 'MonozipRemoteStateMiddleware',
            MonozipStacks.MIDDLEWARE, config.Stage);

        new AwsProvider(this, MonozipAwsStackID.ID, {
            region: config.Region,
            accessKey: config.AccessKey,
            secretKey: config.SecretKey,
        });
        new SecretsManager(this, "SecretsManager", {
            POSTGRES_HOST: storage.getString(MonozipAwsStackID.POSTGRES_DATABASE_ENDPOINT),
            POSTGRES_PORT: storage.getString(MonozipAwsStackID.POSTGRES_DATABASE_PORT),
            POSTGRES_USER: storage.getString(MonozipAwsStackID.POSTGRES_DATABASE_USERNAME),
            POSTGRES_PASSWORD: storage.getString(MonozipAwsStackID.POSTGRES_DATABASE_PASSWORD),
            POSTGRES_DB: storage.getString(MonozipAwsStackID.POSTGRES_DATABASE_DBNAME),
            OPENSEARCH_HOST: storage.getString(MonozipAwsStackID.ELASTICSEARCH_DATABASE_ENDPOINT),
            OPENSEARCH_PORT: "",
            OPENSEARCH_USER: storage.getString(MonozipAwsStackID.ELASTICSEARCH_DATABASE_USERNAME),
            OPENSEARCH_PASS: storage.getString(MonozipAwsStackID.ELASTICSEARCH_DATABASE_PASSWORD),
            OPENSEARCH_USE_SSL: "",
            OPENSEARCH_VERIFY_CERTS: "",
            RABBITMQ_HOST: middleware.getString(MonozipAwsStackID.RABBITMQ_ENDPOINT),
            // RABBITMQ_PORT: middleware.getString(MonozipAwsStackID.RABBITMQ_PORT),
            RABBITMQ_PORT: "",
            RABBITMQ_USER: middleware.getString(MonozipAwsStackID.RABBITMQ_USERNAME),
            RABBITMQ_PASS: middleware.getString(MonozipAwsStackID.RABBITMQ_PASSWORD),
            RABBITMQ_VIRTUAL_HOST: "",
            COGNITO_REGION: config.Region,
            COGNITO_USER_POOL_ID: middleware.getString(MonozipAwsStackID.COGNITO_USER_POOL_ID),
            COGNITO_CLIENT_ID: config.GithubClientID,
        });

    }
}
