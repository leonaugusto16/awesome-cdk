#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwesomeCdkStack } from '../lib/awesome-cdk-stack';

const app = new cdk.App();
new AwesomeCdkStack(app, 'AwesomeCdkStack', {
    env:{
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    stackName: 'AwesomeCdkStack'
});
