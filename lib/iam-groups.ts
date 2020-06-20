import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class IamGroupsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    const clusterAdminRole = new iam.Role(this, 'clusterAdmin', {
      roleName: 'KubernetesAdmin',
      assumedBy: new iam.AccountRootPrincipal()
    });

    const developerRole = new iam.Role(this, 'developer', {
          roleName: 'KubernetesDeveloper',
          assumedBy: new iam.AccountRootPrincipal()
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

    const eksAdminGroup = new iam.Group(this, 'eks-administrators', {
      groupName: 'eks-administrators',
    });

    const eksDeveloperGroup = new iam.Group(this, 'eks-developers', {
          groupName: 'eks-developers',
    });

    // Add Policy in group admin
    const assumeEKSAdminRole = new iam.ManagedPolicy(this, 'assumeEKSAdminRole', {
      managedPolicyName: 'assume-KubernetesAdmin-role'
    });
    assumeEKSAdminRole.addStatements(adminPolicyStatement);
    assumeEKSAdminRole.attachToGroup(eksAdminGroup);

    // Add Policy in group developer
    const assumeEKSDeveloperRole = new iam.ManagedPolicy(this, 'assumeEKSDeveloperRole', {
        managedPolicyName: 'assume-KubernetesDeveloper-role'
    });
    assumeEKSDeveloperRole.addStatements(developerPolicyStatement);
    assumeEKSDeveloperRole.attachToGroup(eksDeveloperGroup);

    props.clusterMain.addResource('NamespaceDev',{
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'development' }
    });

    props.clusterMain.addResource('RoleDev',{
        apiVersion: 'rbac.authorization.k8s.io/v1beta1',
        kind: 'Role',
        metadata: { name: 'dev-role' },
        rules: [{
            apiGroups: ["", "apps", "batch", "extensions"],
            resources: ["configmaps", "cronjobs", "deployments", "events",
                        "ingresses", "jobs", "pods", "pods/attach", "pods/exec",
                        "pods/log", "pods/portforward", "secrets", "services"],
            verbs: ["create", "delete", "describe", "get", "list","patch", "update"]
        }]
    });

    props.clusterMain.addResource('RoleBindingDev',{
        apiVersion: 'rbac.authorization.k8s.io/v1beta1',
        kind: 'RoleBinding',
        metadata: { name: 'dev-role-binding' },
        subjects: [{
            kind: "User",
            name: "dev-user"
        }],
        roleRef: {
            kind: "Role",
            name: "dev-role",
            apiGroup: "rbac.authorization.k8s.io"
        }
    });

    props.clusterMain.awsAuth.addRoleMapping(developerRole, {
      groups: [],
      username: 'dev-user'
    });

    props.clusterMain.awsAuth.addMastersRole(clusterAdminRole, 'k8s-cluster-admin-user');

    // new eks.HelmChart(this, 'Webserver', {
    //   cluster: clusterMain,
    //   chart: 'nginx',
    //   repository: 'https://charts.bitnami.com/bitnami',
    //   namespace: 'default'
    // });
  }

  
}