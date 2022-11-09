import * as process from 'process';
import { Construct } from 'constructs';
import { CognitoIdentityProvider } from '../../.gen/providers/aws/cognito-identity-provider';
import { CognitoUserPool } from '../../.gen/providers/aws/cognito-user-pool';
import { CognitoUserPoolClient } from '../../.gen/providers/aws/cognito-user-pool-client';
import { IamRole } from '../../.gen/providers/aws/iam-role';
import { IamRolePolicyAttachment } from '../../.gen/providers/aws/iam-role-policy-attachment';
import {LambdaFunction } from '../../.gen/providers/aws/lambda-function';
import {  LambdaPermission } from '../../.gen/providers/aws/lambda-permission';
import { S3Bucket } from '../../.gen/providers/aws/s3-bucket';
import {AwsServicePrincipal} from "../constants/aws";

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
  readonly s3Key: string;
}

export class CognitoAuth extends Construct {
  private readonly userPool: CognitoUserPool;
  private readonly role: IamRole;
  private readonly bucket: S3Bucket;
  private readonly fn: LambdaFunction;

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
      bucket: 'monozip-utils-customized-messaging'.toLowerCase(),
    });

    this.fn = new LambdaFunction(this, 'lambda', {
      functionName: 'monozip-customized-messaging',
      role: this.role.arn,
      packageType: 'Zip',
      s3Bucket: this.bucket.bucket,
      s3Key: props.s3Key,
      runtime: 'nodejs14.x',
      handler: 'index.handler',
      architectures: ['x86_64'],
      memorySize: 128, // MB, minimal is 128
      timeout: 30,
      reservedConcurrentExecutions: -1,
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
      lambdaConfig: {
        customMessage: this.fn.arn,
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

    const google = new CognitoIdentityProvider(
      this,
      'CognitoIdentityProviderGoogle',
      {
        userPoolId: this.userPool.id,
        providerName: 'Google',
        providerType: 'Google',
        providerDetails: {
          attributes_url:
            'https://people.googleapis.com/v1/people/me?personFields=',
          attributes_url_add_attributes: 'true',
          authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
          authorize_scopes: 'email profile',
          client_id: process.env.GOOGLE_APP_ID!,
          client_secret: process.env.GOOGLE_APP_SECRET!,
          oidc_issuer: 'https://accounts.google.com',
          token_request_method: 'POST',
          token_url: 'https://www.googleapis.com/oauth2/v4/token',
        },
      },
    );

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
          client_id: process.env.P_GITHUB_CLIENT_ID!,
          client_secret: process.env.P_GITHUB_CLIENT_SECRET!,
          oidc_issuer: process.env.OIDC_ISSUER_URL!,
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
        google.providerName,
        github.providerName,
      ],
      preventUserExistenceErrors: 'ENABLED',
    });

    new LambdaPermission(this, 'lambda-CogitoUserPool', {
      functionName: this.fn.functionName,
      action: 'lambda:InvokeFunction',
      principal: 'cognito-idp.amazonaws.com',
      sourceArn: this.userPool.arn,
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

  public get fnArn(): string {
    return this.fn.arn;
  }
}
