import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class ServiceAccountEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    // create service account to pod use 
    const account = new eks.ServiceAccount(this, 'S3ReadOnlySC', {
        cluster: props.clusterMain,
        name: 's3-read-only',
        namespace: 'default'
    });
    
    // role for pod execute
    account.addToPolicy(new iam.PolicyStatement({
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
                    serviceAccountName: account.serviceAccountName,
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