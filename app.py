#!/usr/bin/env python3

from aws_cdk import core

from awesome_cdk.awesome_cdk_stack import AwesomeCdkStack


app = core.App()
AwesomeCdkStack(app, "awesome-cdk", env={'region': 'us-east-1'})

app.synth()
