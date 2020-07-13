import * as cdk from '@aws-cdk/core';
import kms = require('@aws-cdk/aws-kms');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class JenkinsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);
    
    const helm = new eks.HelmChart(this, 'JenkinsHelm', {
        cluster: props.clusterMain,
        chart: 'jenkins',
        repository: 'https://kubernetes-charts.storage.googleapis.com/',
        namespace: 'default',
        values: {
            rbac: {
                create: 'true'
            },
            master: {
                servicePort: '80',
                serviceType: 'LoadBalancer'
            }
        }
      });
  }
}