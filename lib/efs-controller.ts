import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');
import efs = require('@aws-cdk/aws-efs');
import autoscaling = require('@aws-cdk/aws-autoscaling');


export interface ClusterProps{
    clusterMain: eks.Cluster,
    vpc: ec2.IVpc,
    nodeGroup: autoscaling.AutoScalingGroup
}

export class EfsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    const fileSystem = new efs.FileSystem(this, 'MyEfsFileSystem', {
        vpc: props.vpc,
        encrypted: true,
        lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
        performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
        throughputMode: efs.ThroughputMode.BURSTING,
        removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    fileSystem.connections.allowDefaultPortFrom(props.nodeGroup);
    
    props.nodeGroup.userData.addCommands(
        "yum check-update -y",    
        "yum upgrade -y",                                 
        "yum install -y amazon-efs-utils",                
        "yum install -y nfs-utils",
        "file_system_id_1=" + fileSystem.fileSystemId,
        "efs_mount_point_1=/mnt/efs/fs1",
        "mkdir -p \"${efs_mount_point_1}\"",
        "test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
        "echo \"${file_system_id_1}.efs." + cdk.Stack.of(this).region + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
        "mount -a -t efs,nfs4 defaults"
    );

    props.nodeGroup.addToRolePolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ['elasticfilesystem:DescribeFileSystems'] }));

    const namespaceEfs = props.clusterMain.addResource('NamespaceEfs',{
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": "storage"
        }
    });

    const helmEfsProvisioner = new eks.HelmChart(this, 'efsPovisioner', {
        cluster: props.clusterMain,
        chart: 'efs-provisioner',
        repository: 'https://kubernetes-charts.storage.googleapis.com',
        values: {
            efsProvisioner: {
                efsFileSystemId: fileSystem.fileSystemId,
                awsRegion: cdk.Stack.of(this).region,
                path: '/example-pv',
                provisionerName: 'aws.io/aws-efs'
            }
        },
        namespace: 'storage'
    });
    helmEfsProvisioner.node.addDependency(namespaceEfs);

    props.clusterMain.addResource('StorageClassEfs',{
        "kind": "StorageClass",
        "apiVersion": "storage.k8s.io/v1",
        "metadata": {
          "name": "elastic"
        },
        "provisioner": "aws.io/aws-efs"
    });

    props.clusterMain.addResource('PvcEfs',{
        "kind": "PersistentVolumeClaim",
        "apiVersion": "v1",
        "metadata": {
            "name": "efs-storage-claim",
            "namespace": "storage",
            "annotations": {
                "volume.beta.kubernetes.io/storage-class": "elastic"
            }
        },
        "spec": {
            "accessModes": [
                "ReadWriteMany"
            ],
            "resources": {
                "requests": {
                    "storage": "1Mi"
                }
            }
        }
    });
  }
}