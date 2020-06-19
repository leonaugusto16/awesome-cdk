import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import { KEY_NAME } from './utils/config';

export interface EksProps {
  vpc: ec2.IVpc,
  masterRole: iam.IRole,
  nodeRole: iam.IRole
}

export class EksCluster extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props?: EksProps) {
    super(scope, id);
  }
  createClusterMain(props: EksProps){
    let cluster = new eks.Cluster(this, 'ClusterCD', {
        mastersRole: props.masterRole,
        vpc: props.vpc,
        defaultCapacity: 0
    });
    return cluster
  }
  createNodeGroup(cluster: eks.Cluster , props: EksProps){
    let nodeGroup = new autoscaling.AutoScalingGroup(this, 'AsgEks', {
      vpc: props.vpc,
      instanceType: new ec2.InstanceType('t2.medium'),
      machineImage: new eks.EksOptimizedImage(),
      keyName: KEY_NAME,
      minCapacity: 1,
      maxCapacity: 5,
      desiredCapacity: 3,
      updateType: autoscaling.UpdateType.ROLLING_UPDATE,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE}
    });

    nodeGroup.scaleOnCpuUtilization('up', {targetUtilizationPercent: 80})
    cluster.addAutoScalingGroup(nodeGroup, {
      mapRole: true
    })

    return nodeGroup
  }
  createManagedNodeGroup(cluster: eks.Cluster){
    let nodeGroup = cluster.addNodegroup('NodeGroup', {
      instanceType: new ec2.InstanceType('t2.medium'),
      nodegroupName: 'NodeGroupCD',
      maxSize: 5,
      desiredSize: 3, 
      minSize: 2,
      forceUpdate: true,
      labels: {
        "node": "node-group-cd"
      }
    });
    return nodeGroup
  }
}