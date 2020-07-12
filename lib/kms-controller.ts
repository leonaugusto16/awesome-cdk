import * as cdk from '@aws-cdk/core';
import kms = require('@aws-cdk/aws-kms');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class KmsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    const namespace = props.clusterMain.addResource('NamespaceKms',{
      "apiVersion": "v1",
      "kind": "Namespace",
      "metadata": {
          "name": "secretslab"
      }
    });

    const secret = props.clusterMain.addResource('SecretKms',{
      "apiVersion": "v1",
      "kind": "Secret",
      "metadata": {
        "name": "test-creds",
        "namespace": "secretslab"
      },
      "type": "Opaque",
      "data": {
        "test-creds": "YW0gaSBzYWZlPw==" // base64(am i safe?)
      }
    });
    secret.node.addDependency(namespace);
    // Test Secret --> kubectl get secret test-creds -o jsonpath="{.data.test-creds}" --namespace secretslab | base64 --decode

    // Pod to test
    const pod = props.clusterMain.addResource('PodTest',{
      "apiVersion": "v1",
      "kind": "Pod",
      "metadata": {
        "name": "consumesecret",
        "namespace": "secretslab"
      },
      "spec": {
        "containers": [
          {
            "name": "shell",
            "image": "amazonlinux:2018.03",
            "command": [
              "bin/bash",
              "-c",
              "cat /tmp/test-creds && sleep 10000"
            ],
            "volumeMounts": [
              {
                "name": "sec",
                "mountPath": "/tmp",
                "readOnly": true
              }
            ]
          }
        ],
        "volumes": [
          {
            "name": "sec",
            "secret": {
              "secretName": "test-creds"
            }
          }
        ]
      }
    });
    pod.node.addDependency(secret);
  }
}