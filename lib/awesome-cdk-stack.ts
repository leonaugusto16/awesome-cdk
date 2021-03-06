import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import { YOUR_IP } from './utils/config';

import { EksCluster } from './eks-cluster'
import { JenkinsEks } from './jenkins'

export class AwesomeCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const cidr = "10.0.0.0/24"

    const vpc = new ec2.Vpc(this, 'TestVpc', {
      cidr
    });

    // Permissions for the Kubernetes control plane to make calls to AWS API operations
    const eksRole = new iam.Role(this, 'eksRole', {
      roleName: 'eksRole',
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com')
    });

    // Master role
    const eksClusterAdmin = new iam.Role(this, 'eksClusterAdmin', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const sg = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      allowAllOutbound: true,
      description: 'General security group define nodes',
      securityGroupName: 'sgNodesTest'
    });
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allUdp(), "Configs Port");
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allTcp(), "Configs Port");
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allIcmp(), "Configs Port");

    const eksCluster = new EksCluster(this,'EKS-Cluster');
    const clusterMain = eksCluster.createClusterMain({
      vpc,
      masterRole: eksClusterAdmin,
      nodeRole: eksRole
    });
    const eksNodeGroup = eksCluster.createNodeGroup(clusterMain,{
      vpc,
      masterRole: eksClusterAdmin,
      nodeRole: eksRole
    });

    clusterMain.addResource('NamespaceMetrics',{
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'metrics' }
    });
    new eks.HelmChart(this, 'metrics', {
      cluster: clusterMain,
      chart: 'metrics-server',
      repository: 'https://kubernetes-charts.storage.googleapis.com',
      namespace: 'metrics'
    });

    new JenkinsEks(this, 'JenkinsEks', {clusterMain});
    
  }
}
