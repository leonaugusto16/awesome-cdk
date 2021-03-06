import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import { KEY_NAME } from './utils/config';
import { ClusterAutoscaler } from '@arhea/aws-cdk-eks-cluster-autoscaler';


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
    let clusterMain = new eks.Cluster(this, 'ClusterCD', {
        mastersRole: props.masterRole,
        vpc: props.vpc,
        defaultCapacity: 0,
        version: eks.KubernetesVersion.V1_16
    });
    return clusterMain
  }

  createNodeGroup(clusterMain: eks.Cluster , props: EksProps){
    const nodeGroup = new autoscaling.AutoScalingGroup(this, 'AsgEks', {
      vpc: props.vpc,
      instanceType: new ec2.InstanceType('t2.medium'),
      machineImage: new eks.EksOptimizedImage({
        kubernetesVersion: '1.16'
      }),
      keyName: KEY_NAME,
      minCapacity: 1,
      maxCapacity: 5,
      desiredCapacity: 1,
      updateType: autoscaling.UpdateType.ROLLING_UPDATE,
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
      associatePublicIpAddress: true,
      spotPrice: "1"
    });
    nodeGroup.scaleOnCpuUtilization('up', {targetUtilizationPercent: 80})
    clusterMain.addAutoScalingGroup(nodeGroup, {
      mapRole: true
    });

    // const spotNodes = clusterMain.addCapacity('Spot',{
    //   spotPrice: '1',
    //   instanceType: new ec2.InstanceType('t2.medium'),
    //   minCapacity: 2,
    //   maxCapacity: 10
    // });
    // spotNodes.node.addDependency(nodeGroup);

    // const podSpotHandler = new eks.HelmChart(this, 'SpotHandler', {
    //   cluster: clusterMain,
    //   chart: 'aws-node-termination-handler',
    //   repository: 'https://aws.github.io/eks-charts',
    //   namespace: 'kube-system',
    //   values: {'nodeSelector.lifecycle': 'Ec2Spot'}
    // });
    // podSpotHandler.node.addDependency(spotNodes);

    return nodeGroup
  }

  createManagedNodeGroup(clusterMain: eks.Cluster){
    let nodeGroup = clusterMain.addNodegroup('NodeGroup', {
      instanceType: new ec2.InstanceType('t2.medium'),
      nodegroupName: 'NodeGroupCD',
      maxSize: 5,
      desiredSize: 3, 
      minSize: 3,
      forceUpdate: true,
      labels: {
        "node": "node-group-cd"
      }
    });
    return nodeGroup
  }

  addAutoScaler(clusterMain: eks.Cluster, ng: autoscaling.AutoScalingGroup){
    let ca = new ClusterAutoscaler(this, 'demo-cluster-autoscaler', {
      cluster: clusterMain, // your EKS cluster
      nodeGroups: [ ng ], // a list of your node groups
      version: 'v1.16.5' // the version of cluster autoscaler to deploy
    });

    return ca
  }
}