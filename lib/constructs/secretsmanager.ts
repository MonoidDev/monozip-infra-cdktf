import {Construct} from 'constructs';
import {SecretsmanagerSecret} from '../../.gen/providers/aws/secretsmanager-secret';
import {SecretsmanagerSecretVersion} from '../../.gen/providers/aws/secretsmanager-secret-version';

export class SecretsManager extends Construct {
    constructor(scope: Construct, id: string, secrets:Secrets) {
        super(scope, id);

       const manager =  new SecretsmanagerSecret(this, id, {
            name: "monozip-demo",
        })
        new SecretsmanagerSecretVersion(this, "SecretsmanagerSecretVersion", {
            secretId: manager.id,
            secretString: JSON.stringify(secrets),
        })

    }
}

export interface Secrets {
    readonly POSTGRES_HOST: string;
    readonly POSTGRES_PORT: string;
    readonly POSTGRES_USER: string;
    readonly POSTGRES_PASSWORD: string;
    readonly POSTGRES_DB: string;
    readonly OPENSEARCH_HOST: string;
    readonly OPENSEARCH_PORT: string;
    readonly OPENSEARCH_USER: string;
    readonly OPENSEARCH_PASS: string;
    readonly OPENSEARCH_USE_SSL: string;
    readonly OPENSEARCH_VERIFY_CERTS: string;
    readonly RABBITMQ_HOST: string;
    readonly RABBITMQ_PORT: string;
    readonly RABBITMQ_USER: string;
    readonly RABBITMQ_PASS: string;
    readonly RABBITMQ_VIRTUAL_HOST: string;
    readonly COGNITO_REGION: string;
    readonly COGNITO_USER_POOL_ID: string;
    readonly COGNITO_CLIENT_ID: string;
}

