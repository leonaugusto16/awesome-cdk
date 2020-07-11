import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam');

export interface ClusterProps{
    clusterMain: eks.Cluster,
    namespace: string
}

export class FargateEks extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
      super(scope, id);
      props.clusterMain.addResource('my-namespace', {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: props.namespace }
      });

      props.clusterMain.addFargateProfile('ProfileFargate', {
        selectors: [ { namespace: props.namespace } ]
      });
    }
}