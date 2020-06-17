import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface EksProps {
  vpc: ec2.IVpc,
  clusterRole: iam.IRole,
  nodeRole: iam.IRole
}
export class EksCluster extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id);
    
    const cluster = new eks.Cluster(this, 'ClusterCD', {
        mastersRole: props.clusterRole,
        vpc: props.vpc,
        defaultCapacity: 0
    });

    cluster.addNodegroup('NodeGroup', {
      instanceType: new ec2.InstanceType('t2.medium'),
      nodegroupName: 'NodeGroupCD',
      desiredSize: 3, 
      minSize: 2,
      forceUpdate: true,
      labels: {
        "node": "node-group-cd"
      }
    });
  }
}