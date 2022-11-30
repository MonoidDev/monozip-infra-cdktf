## Create organization on terraform cloud
```
https://app.terraform.io/app
```

## Login terraform cloud
```bash
cdktf login
```

## Create workspaces
-  Create workspaces

<img src="./img/WorkSpaces.png" />

-  Settings `remote state sharing`

<img src="./img/WorkSpace-Settings-RemoteStateSharing.png" />

## Create OAuth app on github
```
https://github.com/settings/developers
```

<img src="./img/OAuth-App.png" />

## Modifying the Configuration File
```bash
cp config.json.back config.json
```

```json
{
  "Stage": "test",
  "Region": "ap-northeast-1",
  "AccessKey": "xxxxxxxxxxxxxxxx",
  "SecretKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "CognitoAuthCallbackUrls": [
    "https://xxxxxxxxxxxx.com/Login?k=v"
  ],
  "CognitoAuthLogoutUrls": [
    "https://xxxxxxxxxxxx.com/Login"
  ],
  "CognitoAuthS3BucketName": "monozip-demo-customized-messaging",
  "GithubClientID" : "oauth app client id",
  "GithubClientSecret" : "oauth app client secret",
  "OIDCIssuerURL" : "https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev",
  "ServicePort": 8080,
  "RDSDeletionProtection": false
}
```

## Deploy
### MonozipDemoNetworkStack
```bash
cdktf deploy MonozipDemoNetworkStack
```
<img src="./img/VPC.png" />

### MonozipDemoStorageStack
```bash
cdktf deploy MonozipDemoStorageStack
```
ElasticSearch

<img src="./img/ElasticSearch.png" />

PostgresDatabase

<img src="./img/PostgresDatabase.png" />

### MonozipDemoMiddlewareStack
```bash
cdktf deploy MonozipDemoMiddlewareStack
```
RabbitMQ

<img src="./img/RabbitMQ.png" />


### MonozipDemoGatewayStack
```bash
cdktf deploy MonozipDemoGatewayStack
```
ALB

<img src="./img/ALB.png" />


### MonozipDemoImageRepoStack
```bash
cdktf deploy MonozipDemoImageRepoStack
```

### MonozipDemoSecretsManagerStack
```bash
cdktf deploy MonozipDemoSecretsManagerStack
```

<img src="./img/SSM.png" />


### Push image to ECR
```bash
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin xxxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com
docker push xxxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/monozip-demo/monozip-demo-api:latest
```
or
```bash
todo github action 
```
<img src="./img/ECR-image.png" />


### MonozipDemoComputeStack
```bash
cdktf deploy MonozipDemoComputeStack
```

### Testing

```bash

curl https://xxxx.xxxx.xxx/rebbitmq


```