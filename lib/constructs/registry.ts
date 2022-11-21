import { Construct } from 'constructs';
import { DataAwsCallerIdentity } from '../../.gen/providers/aws/data-aws-caller-identity';
import { DataAwsRegion } from '../../.gen/providers/aws/data-aws-region';
import { DataAwsEcrImage } from '../../.gen/providers/aws/data-aws-ecr-image';
import { EcrRepository } from '../../.gen/providers/aws/ecr-repository';

interface AwsRegistryProps {
  namespace: string;
}

export class ContainerRegistry extends Construct {
  private readonly _namespace: string;
  private readonly accountId: string;
  private readonly region: string;

  constructor(scope: Construct, id: string, props: AwsRegistryProps) {
    super(scope, id);
    this._namespace = props.namespace;
    this.accountId = new DataAwsCallerIdentity(this, 'AwsCallerIdentity').accountId;
    this.region = new DataAwsRegion(this, 'AwsRegion').name;
  }

  public addRepository(name: string): ContainerRepository {
    return new ContainerRepository(this, `${name}-Repository`, {
      repositoryName: `${this._namespace}/${name}`,
    });
  }

  public get registryUrl(): string {
    return `https://${this.accountId}.dkr.ecr.${this.region}.amazonaws.com`;
  }
}

interface RepositoryProps {
  repositoryName: string;
}

export class ContainerRepository extends Construct {
  private readonly repository: EcrRepository;

  constructor(scope: Construct, id: string, props: RepositoryProps) {
    super(scope, id);

    this.repository = new EcrRepository(this, 'EcrRepository', {
      name: props.repositoryName,
      encryptionConfiguration: [{
        encryptionType: 'KMS',
      }],
      imageTagMutability: 'MUTABLE',
    });
  }

  public getRepositoryUrl(): string {
    return `${this.repository.repositoryUrl}`;
  }
  public getImageUrl(tag: string): string {
    const image = new DataAwsEcrImage(this, `Image-${tag}`, {
      repositoryName: this.repository.name,
      imageTag: tag,
    });
    return `${this.repository.repositoryUrl}:${image.imageTag}`;
  }
}
