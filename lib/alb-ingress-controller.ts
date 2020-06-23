import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster,
    serviceAccount: eks.ServiceAccount
}

export class AlbIngressControllerEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    props.clusterMain.addResource('AlbIngressController',{
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { 
            labels: {'app.kubernetes.io/name': 'alb-ingress-controller'},
            name: 'alb-ingress-controller',
            namespace: 'kube-system'
        },
        spec: {
            selector: {
                matchLabels: {'app.kubernetes.io/name': 'alb-ingress-controller'}
            },
            template: {
                metadata: {
                    labels: {'app.kubernetes.io/name': 'alb-ingress-controller'}
                },
                spec: {
                    containers: [{
                        name: 'alb-ingress-controller',
                        args: ['--ingress-class=alb', '--cluster-name='+props.clusterMain.clusterName],
                        image: 'docker.io/amazon/aws-alb-ingress-controller:v1.1.4'
                    }],
                    serviceAccountName: props.serviceAccount.serviceAccountName
                },
            }
        }
    });
  }  
}