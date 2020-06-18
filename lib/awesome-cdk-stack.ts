import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import eks = require('@aws-cdk/aws-eks');
import { YOUR_IP } from './utils/config';

import { EksCluster } from './eks-cluster'

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

    // const instanceRole = new iam.Role(this, 'instanceRole', {
    //   assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    // });
    // instanceRole.addToPolicy(new iam.PolicyStatement({
    //   actions: ["ec2:DescribeInstances", "ec2:CreateTags", "ec2:DescribeTags"],
    //   resources: ['*'],
    // }));
    // instanceRole.addToPolicy(new iam.PolicyStatement({
    //   actions: ["autoscaling:DescribeAutoScalingGroups",
    //             "autoscaling:DescribeAutoScalingInstances",
    //             "autoscaling:SetDesiredCapacity",
    //             "autoscaling:TerminateInstanceInAutoScalingGroup",
    //             "autoscaling:DescribeTags"],
    //   resources: ['*'],
    // }));

    const sg = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      allowAllOutbound: true,
      description: 'General security group define nodes',
      securityGroupName: 'sgNodesTest'
    });
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allUdp(), "Configs Port");
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allTcp(), "Configs Port");
    sg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.allIcmp(), "Configs Port");
    sg.addIngressRule(ec2.Peer.ipv4(YOUR_IP), ec2.Port.allTcp(), "Configs Port");

    const alb = new elbv2.ApplicationLoadBalancer(this, 'AlbEks', {
      loadBalancerName: 'AlbEks',
      vpc,
      securityGroup: sg,
      internetFacing: true,
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC}
    });

    const httpListener = alb.addListener("HttpListenerEks", {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      open: true
    });
    httpListener.addFixedResponse("FixedResponse", {
      statusCode: "404"
    });

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

    httpListener.addTargets('TargetGroup', {
      targetGroupName: 'eksTest',
      port: 30080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [eksNodeGroup]
    });

    const clusterAdminRole = new iam.Role(this, 'clusterAdmin', {
      roleName: 'KubernetesAdmin',
      assumedBy: new iam.AccountRootPrincipal()
    });

    const developerRole = new iam.Role(this, 'developer', {
          roleName: 'KubernetesDeveloper',
          assumedBy: new iam.AccountRootPrincipal()
    });

    const eksAdminGroup = new iam.Group(this, 'eks-administrators', {
      groupName: 'eks-administrators',
    });

    const eksDeveloperGroup = new iam.Group(this, 'eks-developers', {
          groupName: 'eks-developers',
    });

    const adminPolicyStatement = new iam.PolicyStatement({
      resources: [clusterAdminRole.roleArn],
      actions: ['sts:AssumeRole'],
      effect: iam.Effect.ALLOW
    });

    const developerPolicyStatement = new iam.PolicyStatement({
      resources: [developerRole.roleArn],
      actions: ['sts:AssumeRole'],
      effect: iam.Effect.ALLOW
    });
  
    const assumeEKSAdminRole = new iam.ManagedPolicy(this, 'assumeEKSAdminRole', {
      managedPolicyName: 'assume-KubernetesAdmin-role'
    });
    assumeEKSAdminRole.addStatements(adminPolicyStatement);
    assumeEKSAdminRole.attachToGroup(eksAdminGroup);


    const assumeEKSDeveloperRole = new iam.ManagedPolicy(this, 'assumeEKSDeveloperRole', {
        managedPolicyName: 'assume-KubernetesDeveloper-role'
    });
    assumeEKSDeveloperRole.addStatements(developerPolicyStatement);
    assumeEKSDeveloperRole.attachToGroup(eksDeveloperGroup);

    // new eks.HelmChart(this, 'Webserver', {
    //   cluster: clusterMain,
    //   chart: 'nginx',
    //   repository: 'https://charts.bitnami.com/bitnami',
    //   namespace: 'default'
    // });

    new eks.HelmChart(this, 'metrics', {
      cluster: clusterMain,
      chart: 'metrics-server',
      repository: 'https://kubernetes-charts.storage.googleapis.com',
      namespace: 'metrics'
    });

  }
}
