export enum MonozipStacks {
    NETWORK = 'network',
    STORAGE = 'storage',
    GATEWAY = 'gateway',
    MIDDLEWARE = 'middleware',
    COMPUTE = 'compute',
    DELIVERY = 'delivery',
}

export enum MonozipAwsStackID {
    ID = 'AwsProvider',
    VPC_ID = 'VpcId',
    VPC_CIDR = 'VpcCidr',
    NETWORK_PRIVATE_SUBNETS = "PrivateSubnetIds",
    NETWORK_PUBLIC_SUBNETS = "PublicSubnetIds",
    NETWORK_PRIVATE_CIDRS = "PrivateSubnetCidrs",
    NETWORK_PUBLIC_CIDRS = "PublicSubnetCidrs",
    NETWORK_DATABASE_SUBNETS = "DatabaseSubnetCidrs",
    NETWORK_DATABASE_CIDRS = "DatabaseSubnetIds",


   REMOTE_STATE_ID = 'MonozipRemoteState',
}

