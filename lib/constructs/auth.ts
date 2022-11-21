import { Construct } from 'constructs';
import { CognitoIdentityProvider } from '../../.gen/providers/aws/cognito-identity-provider';
import { CognitoUserPool } from '../../.gen/providers/aws/cognito-user-pool';
import { CognitoUserPoolClient } from '../../.gen/providers/aws/cognito-user-pool-client';
import { IamRole } from '../../.gen/providers/aws/iam-role';
import { IamRolePolicyAttachment } from '../../.gen/providers/aws/iam-role-policy-attachment';
import { S3Bucket } from '../../.gen/providers/aws/s3-bucket';
import { AwsServicePrincipal } from "../constants/aws";
import * as config from '../../config.json';

const LambdaRolePolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: 'sts:AssumeRole',
      Principal: {
        Service: AwsServicePrincipal.LAMBDA,
      },
      Effect: 'Allow',
      Sid: '',
    },
  ],
};
export interface CognitoAuthProps {
  readonly name: string;
  readonly callbackUrls: string[];
  readonly logoutUrls: string[];
  readonly bucketName: string;
}

export class CognitoAuth extends Construct {
  private readonly userPool: CognitoUserPool;
  private readonly role: IamRole;
  private readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    this.role = new IamRole(this, 'role', {
      name: 'monozip-customized-messaging-role',
      assumeRolePolicy: JSON.stringify(LambdaRolePolicy),
    });

    new IamRolePolicyAttachment(this, 'role-AWSLambdaBasicExecutionRole', {
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      role: this.role.name,
    });

    this.bucket = new S3Bucket(this, 'bucket', {
      bucket: props.bucketName.toLowerCase(),
    });

    this.userPool = new CognitoUserPool(this, 'CognitoUserPool', {
      name: props.name,
      accountRecoverySetting: {
        recoveryMechanism: [
          {
            name: 'verified_email',
            priority: 1,
          },
        ],
      },

      autoVerifiedAttributes: ['email'],
      lifecycle: {
        ignoreChanges: ['schema'],
      },
      schema: [
        {
          attributeDataType: 'String',
          name: 'preferred_username',
          required: false,
        },
      ],
      passwordPolicy: {
        minimumLength: 6,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false,
        temporaryPasswordValidityDays: 7,
      },
    });

    const github = new CognitoIdentityProvider(
      this,
      'CognitoIdentityProviderGithub',
      {
        userPoolId: this.userPool.id,
        providerName: 'Github',
        providerType: 'OIDC',
        providerDetails: {
          authorize_scopes: 'openid read:user user:email',
          attributes_url_add_attributes: 'false',
          client_id: config.GithubClientID,
          client_secret: config.GithubClientSecret,
          oidc_issuer: config.OIDCIssuerURL,
          attributes_request_method: 'POST',
        },
      },
    );

    new CognitoUserPoolClient(this, 'CognitoUserPoolClient', {
      name: `${props.name}-client`,
      userPoolId: this.userPool.id,
      callbackUrls: props.callbackUrls,
      logoutUrls: props.logoutUrls,
      allowedOauthFlows: ['implicit'],
      allowedOauthScopes: [
        'phone',
        'email',
        'openid',
        'profile',
        'aws.cognito.signin.user.admin',
      ],
      supportedIdentityProviders: [
        'COGNITO',
        github.providerName,
      ],
      preventUserExistenceErrors: 'ENABLED',
    });

  }

  public get userPoolId(): string {
    return this.userPool.id;
  }

  public get roleArn(): string {
    return this.role.arn;
  }

  public get bucketArn(): string {
    return this.bucket.arn;
  }
}
