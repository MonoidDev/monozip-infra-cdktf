import { Construct } from 'constructs';
import { DataAwsCallerIdentity } from '../../.gen/providers/aws/data-aws-caller-identity';
import { DataAwsIamPolicyDocument } from '../../.gen/providers/aws/data-aws-iam-policy-document';
import { IamRole } from '../../.gen/providers/aws/iam-role';
import * as config from '../../config.json';

export interface FargateCognitoRoleProps {
  readonly userPoolId: string;
}

export class FargateCognitoRole extends Construct {
  readonly role: IamRole;

  constructor(scope: Construct, id: string, props: FargateCognitoRoleProps) {
    super(scope, id);

    const assumeRolePolicy = new DataAwsIamPolicyDocument(this, 'StsIamPolicyDocument', {
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        actions: ['sts:AssumeRole'],
        principals: [{
          type: 'Service',
          identifiers: ['ecs-tasks.amazonaws.com'],
        }],
      }],
    });

    const callerId = new DataAwsCallerIdentity(this, 'DataAwsCallerIdentity');

    const cognitoPolicy = new DataAwsIamPolicyDocument(this, 'CognitoIamPolicyDocument', {
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        actions: ['cognito-idp:AdminGetUser'],
        resources: [`arn:aws:cognito-idp:${config.Region}:${callerId.accountId}:userpool/${props.userPoolId}`],
      }],
    });

    const secretsManagerPolicy = new DataAwsIamPolicyDocument(this, 'SecretsManagerIamPolicyDocument', {
      version: '2012-10-17',
      statement: [
        {
          effect: 'Allow',
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:Describesecret',
          ],
          resources: [`arn:aws:secretsmanager:${config.Region}:${callerId.accountId}:secret:pro/monozip-demo-TyyeJc`],
        },
      ],
    });

    const cloudMapPolicy = new DataAwsIamPolicyDocument(this, 'CloudMapIamPolicyDocument', {
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        actions: ['servicediscovery:*'],
        resources: ['*'],
      }],
    });

    const openSearchPolicy = new DataAwsIamPolicyDocument(this, 'OpenSearchIamPolicyDocument', {
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        actions: ['es:*'],
        resources: ['*'],
      }],
    });

    this.role = new IamRole(this, 'CognitoFargateRole', {
      name: 'monozip-fargate-role',
      assumeRolePolicy: assumeRolePolicy.json,
      inlinePolicy: [
        {
          name: 'cognito-AdminGetUser',
          policy: cognitoPolicy.json,
        },
        {
          name: 'secretsmanager-GetSecretValue',
          policy: secretsManagerPolicy.json,
        },
        {
          name: 'cloudmap-All',
          policy: cloudMapPolicy.json,
        },
        {
          name: 'opensearch-All',
          policy: openSearchPolicy.json,
        },
      ],
    });
  }

  public get roleArn(): string {
    return this.role.arn;
  }
}
