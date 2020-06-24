import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam')
export interface ClusterProps{
    clusterMain: eks.Cluster,
    serviceAccount: eks.ServiceAccount,
}

export class AlbIngressControllerEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["acm:DescribeCertificate","acm:ListCertificates","acm:GetCertificate"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["ec2:AuthorizeSecurityGroupIngress",
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
            "ec2:RevokeSecurityGroupIngress"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["elasticloadbalancing:AddListenerCertificates",
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
            "elasticloadbalancing:SetWebACL"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["iam:CreateServiceLinkedRole",
            "iam:GetServerCertificate",
            "iam:ListServerCertificates"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["cognito-idp:DescribeUserPoolClient"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["waf-regional:GetWebACLForResource",
            "waf-regional:GetWebACL",
            "waf-regional:AssociateWebACL",
            "waf-regional:DisassociateWebACL"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["tag:GetResources","tag:TagResources"]
    }));

    props.serviceAccount.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["waf:GetWebACL"]
    }));

    props.clusterMain.addResource('AlbClusterRole', {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata:{
            labels: {'app.kubernetes.io/name': props.serviceAccount.serviceAccountName},
            name: props.serviceAccount.serviceAccountName
        },
        rules: [{
            apiGroups: ["", "extensions"],
            resources: ["configmaps", "endpoints", "events", "ingresses",
                        "ingresses/status", "services"],
            verbs: ["create","get","list","update","watch","patch"]
        },
        {
            apiGroups: ["","extensions"],
            resources: ["nodes","pods","secrets","services","namespaces"],
            verbs: ["get","list","watch"]
        }]
    });

    props.clusterMain.addResource('AlbClusterRoleBindind',{
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            "app.kubernetes.io/name": props.serviceAccount.serviceAccountName
          },
          name: props.serviceAccount.serviceAccountName
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: props.serviceAccount.serviceAccountName
        },
        subjects: [{
            kind: "ServiceAccount",
            name: props.serviceAccount.serviceAccountName,
            namespace: "kube-system"
        }]
    });
    
    props.clusterMain.addResource('AlbIngressController',{
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { 
            labels: {'app.kubernetes.io/name': props.serviceAccount.serviceAccountName},
            name: props.serviceAccount.serviceAccountName,
            namespace: 'kube-system'
        },
        spec: {
            selector: {
                matchLabels: {'app.kubernetes.io/name': props.serviceAccount.serviceAccountName}
            },
            template: {
                metadata: {
                    labels: {'app.kubernetes.io/name': props.serviceAccount.serviceAccountName}
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