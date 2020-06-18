import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');

import { EksCluster } from './eks-cluster'

export class AwesomeCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const cidr = "10.0.0.0/24"

    const vpc = new ec2.Vpc(this, 'TestVpc', {
      cidr
    })
    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const instanceRole = new iam.Role(this, 'instanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: ["ec2:DescribeInstances", "ec2:CreateTags", "ec2:DescribeTags"],
      resources: ['*'],
    }));

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
      clusterRole: clusterAdmin,
      nodeRole: instanceRole
    });
    eksCluster.createNodeGroup(clusterMain)

    // new eks.HelmChart(this, 'Webserver', {
    //   cluster: clusterMain,
    //   chart: 'nginx',
    //   repository: 'https://charts.bitnami.com/bitnami',
    //   namespace: 'default'
    // });

  }
}
