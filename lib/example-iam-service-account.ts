import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
    serviceAccount: eks.ServiceAccount
}

export class ExampleServiceAccountEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    // role for pod execute
    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["s3:ListAllMyBuckets","s3:ListBucket","s3:HeadBucket"]
    }));

    // execute deployment with role
    props.clusterMain.addResource('PodToTest',{
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: "eks-iam-test" },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: {
                    app: "eks-iam-test"
                }
            },
            template: {
                metadata: {
                    labels: {
                        app: "eks-iam-test"
                    }
                },
                spec: {
                    serviceAccountName: props.serviceAccount.serviceAccountName,
                    containers: [{
                        name: "eks-iam-test",
                        image: "sdscello/awscli:latest",
                        ports: [{ "containerPort": 80 }]
                    }]
                }
            }
        }
    });
  }
}