export enum MonozipStacks {
    NETWORK = "network",
    STORAGE = "storage",
    GATEWAY = "gateway",
    MIDDLEWARE = "middleware",
    COMPUTE = "compute",
    IMAGE = "image",
    SECRETS_MANAGER = "secrets-manager",
    DELIVERY = "delivery",
}

export enum MonozipAwsStackID {
    ID = "AwsProvider",
    VPC_ID = "VpcId",
    VPC_CIDR = "VpcCidr",
    NETWORK_PRIVATE_SUBNETS = "PrivateSubnetIds",
    NETWORK_PUBLIC_SUBNETS = "PublicSubnetIds",
    NETWORK_PRIVATE_CIDRS = "PrivateSubnetCidrs",
    NETWORK_PUBLIC_CIDRS = "PublicSubnetCidrs",
    NETWORK_DATABASE_SUBNETS = "DatabaseSubnetCidrs",
    NETWORK_DATABASE_CIDRS = "DatabaseSubnetIds",


    REMOTE_STATE_ID = "MonozipRemoteState",

    POSTGRES_DATABASE_ENDPOINT = "PostgresDatabaseEndpoint",
    POSTGRES_DATABASE_USERNAME = "PostgresDatabaseUsername",
    POSTGRES_DATABASE_PASSWORD = "PostgresDatabasePassword",
    POSTGRES_DATABASE_PORT = "PostgresDatabasePort",
    POSTGRES_DATABASE_DBNAME = "PostgresDatabaseDbName",

    ELASTICSEARCH_DATABASE_ENDPOINT = "ElasticSearchDatabaseEndpoint",
    ELASTICSEARCH_DATABASE_PORT = "ElasticSearchDatabasePort",
    ELASTICSEARCH_DATABASE_USERNAME = "ElasticSearchDatabaseUsername",
    ELASTICSEARCH_DATABASE_PASSWORD = "ElasticSearchDatabasePassword",

    RABBITMQ_ENDPOINT = "RabbitMqDemoEndpoint",
    RABBITMQ_USERNAME = "RabbitMqDemoUsername",
    RABBITMQ_PORT = "RabbitMqDemoPort",
    RABBITMQ_PASSWORD = "RabbitMqDemoPassword",
    COGNITO_USER_POOL_ID = "CognitoUserPoolId",
}

