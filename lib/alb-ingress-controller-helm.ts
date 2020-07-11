import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2')
import { Stack } from '@aws-cdk/core';

export interface ClusterProps{
    clusterMain: eks.Cluster,
    namespace: string,
    vpc: ec2.IVpc,
    region: string
}

export class AlbIngressControllerEksHelm extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);
    const account = new eks.ServiceAccount(this, 'ALBIngressController', {
        cluster: props.clusterMain,
        name: 'alb-ingress-controller',
        namespace: props.namespace
    });

    //Permissions to version 1.18 (https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.1.8/docs/examples/iam-policy.json)
    account.addToPolicy( new iam.PolicyStatement({
        resources: ['*'],
        actions: [
        "acm:DescribeCertificate",
        "acm:ListCertificates",
        "acm:GetCertificate",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateSecurityGroup",
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "ec2:DeleteSecurityGroup",
        "ec2:DescribeAccountAttributes",
        "ec2:DescribeAddresses",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeTags",
        "ec2:DescribeVpcs",
        "ec2:ModifyInstanceAttribute",
        "ec2:ModifyNetworkInterfaceAttribute",
        "ec2:RevokeSecurityGroupIngress",
        "elasticloadbalancing:AddListenerCertificates",
        "elasticloadbalancing:AddTags",
        "elasticloadbalancing:CreateListener",
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:CreateRule",
        "elasticloadbalancing:CreateTargetGroup",
        "elasticloadbalancing:DeleteListener",
        "elasticloadbalancing:DeleteLoadBalancer",
        "elasticloadbalancing:DeleteRule",
        "elasticloadbalancing:DeleteTargetGroup",
        "elasticloadbalancing:DeregisterTargets",
        "elasticloadbalancing:DescribeListenerCertificates",
        "elasticloadbalancing:DescribeListeners",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeLoadBalancerAttributes",
        "elasticloadbalancing:DescribeRules",
        "elasticloadbalancing:DescribeSSLPolicies",
        "elasticloadbalancing:DescribeTags",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetGroupAttributes",
        "elasticloadbalancing:DescribeTargetHealth",
        "elasticloadbalancing:ModifyListener",
        "elasticloadbalancing:ModifyLoadBalancerAttributes",
        "elasticloadbalancing:ModifyRule",
        "elasticloadbalancing:ModifyTargetGroup",
        "elasticloadbalancing:ModifyTargetGroupAttributes",
        "elasticloadbalancing:RegisterTargets",
        "elasticloadbalancing:RemoveListenerCertificates",
        "elasticloadbalancing:RemoveTags",
        "elasticloadbalancing:SetIpAddressType",
        "elasticloadbalancing:SetSecurityGroups",
        "elasticloadbalancing:SetSubnets",
        "elasticloadbalancing:SetWebACL",
        "iam:CreateServiceLinkedRole",
        "iam:GetServerCertificate",
        "iam:ListServerCertificates",
        "cognito-idp:DescribeUserPoolClient",
        "waf:GetWebACL",
        "wafv2:GetWebACL",
        "wafv2:GetWebACLForResource",
        "wafv2:AssociateWebACL",
        "wafv2:DisassociateWebACL",
        "shield:DescribeProtection",
        "shield:GetSubscriptionState",
        "shield:DeleteProtection",
        "shield:CreateProtection",
        "shield:DescribeSubscription",
        "shield:ListProtections",
        "waf-regional:GetWebACLForResource",
        "waf-regional:GetWebACL",
        "waf-regional:AssociateWebACL",
        "waf-regional:DisassociateWebACL",
        "tag:GetResources",
        "tag:TagResources"
        ]
    }));
    
    props.clusterMain.addResource('ALBIngressControllerRBAC',{
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "ClusterRole",
        "metadata": {
            "labels": {
            "app.kubernetes.io/name": account.serviceAccountName
            },
            "name": account.serviceAccountName
        },
        "rules": [
            {
            "apiGroups": [
                "",
                "extensions"
            ],
            "resources": [
                "configmaps",
                "endpoints",
                "events",
                "ingresses",
                "ingresses/status",
                "services"
            ],
            "verbs": [
                "create",
                "get",
                "list",
                "update",
                "watch",
                "patch"
            ]
            },
            {
            "apiGroups": [
                "",
                "extensions"
            ],
            "resources": [
                "nodes",
                "pods",
                "secrets",
                "services",
                "namespaces"
            ],
            "verbs": [
                "get",
                "list",
                "watch"
            ]
            }
        ]
        },
        {
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "ClusterRoleBinding",
        "metadata": {
            "labels": {
            "app.kubernetes.io/name": account.serviceAccountName
            },
            "name": account.serviceAccountName
        },
        "roleRef": {
            "apiGroup": "rbac.authorization.k8s.io",
            "kind": "ClusterRole",
            "name": account.serviceAccountName
        },
        "subjects": [
            {
            "kind": "ServiceAccount",
            "name": account.serviceAccountName,
            "namespace": props.namespace
            }
        ]
    });

    props.clusterMain.addChart('ALBIngressController', {
        chart: 'aws-alb-ingress-controller',
        repository: 'http://storage.googleapis.com/kubernetes-charts-incubator',
        namespace: props.namespace,
        values: {
            awsRegion: props.region,
            awsVpcID: props.vpc.vpcId,
            clusterName: props.clusterMain.clusterName,
            rbac: {
                create: false,
                serviceAccount: {
                    name: account.serviceAccountName
                }
            }
        }
    });
  }  
}