# AppDynamics Grafana Data Source Plugin

[![CI](https://github.com/morganstanley/Plug-in-AppDynamics-Data-Source/actions/workflows/main.yml/badge.svg)](https://github.com/morganstanley/Plug-in-AppDynamics-Data-Source/actions/workflows/main.yml)

This is a CDK for Terraform(CDKTF) example.

<img src="./img/AppD.png"  height="500" />
<img src="./img/Dashboard.png"  height="500" />


## Prerequisites
```bash
✗ cdktf --version
0.13.0

✗ terraform --version
Terraform v1.2.9
on darwin_amd64

✗ node -v
v16.14.2

✗ aws --version
aws-cli/2.4.28 Python/3.8.8 Darwin/21.6.0 exe/x86_64 prompt/off
```


## Getting started

1. Log into Terraform Cloud:

   ```bash
   cdktf login
   ```

2. Download the source code

   ```bash

   ```


3. Use Prebuilt Providers

   ```bash
   pnpm install @cdktf/provider-aws
   cdktf provider add "aws@~>4.0"
   ```

4. Deploy

   ```bash
   cdktf deploy MonozipDemoNetworkStack
   cdktf deploy MonozipDemoStorageStack
   cdktf deploy MonozipDemoMiddlewareStack
   cdktf deploy MonozipDemoGatewayStack
   cdktf deploy MonozipDemoImageRepoStack
   cdktf deploy MonozipDemoSecretsManagerStack
   aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin xxxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com
   docker push xxxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/monozip-demo/monozip-demo-api:latest
   cdktf deploy MonozipDemoComputeStack
   ```
For more information to deploy, check out the [Deployment Guides](./docs/Deployment.md).



## Contribution Guide

### Become a contributor

You can contribute to us in several ways. Here are some examples:

- Contribute to the codebase.
- Report and triage bugs.
- Develop community plugins and dashboards.
- Write technical documentation and blog posts, for users and contributors.
- Organize meetups and user groups in your local area.
- Help others by answering questions about this plugin.

For more ways to contribute, check out the [Open Source Guides](https://opensource.guide/how-to-contribute/).

### Contributing
If you are interested in contributing to Fluent bit with bug fixes, new features or coding in general, please refer to the code [CONTRIBUTING](./CONTRIBUTING.md) guidelines. 