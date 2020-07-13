import * as cdk from '@aws-cdk/core';
import kms = require('@aws-cdk/aws-kms');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class SecretsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);
    
    const namespace = props.clusterMain.addResource('NamespaceKms',{
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": "octank"
        }
      });

      const secret = props.clusterMain.addResource('SecretKms',{
        "apiVersion": "v1",
        "data": {
          "password": "VHJ1NXROMCE=",
          "username": "YWRtaW4="
        },
        "kind": "Secret",
        "metadata": {
          "name": "database-credentials",
          "namespace": "octank"
        },
        "type": "Opaque"
    });
    secret.node.addDependency(namespace)

  }
  volumeSecret(props: ClusterProps){
    const pod = props.clusterMain.addResource('PodTestVolume', {
        "apiVersion": "v1",
        "kind": "Pod",
        "metadata": {
            "name": "pod-volume",
            "namespace": "octank"
        },
        "spec": {
            "containers": [
                {
                    "name": "database",
                    "image": "busybox",
                    "command": [
                        "/bin/sh"
                    ],
                    "args": [
                        "-c",
                        "echo cat /etc/data/DATABASE_USER;cat /etc/data/DATABASE_USER; echo; echo cat /etc/data/DATABASE_PASSWORD; cat /etc/data/DATABASE_PASSWORD; echo; while true; do sleep 1; done"
                    ],
                    "volumeMounts": [
                        {
                            "name": "secret-volume",
                            "mountPath": "/etc/data",
                            "readOnly": true
                        }
                    ]
                }
            ],
            "volumes": [
                {
                    "name": "secret-volume",
                    "secret": {
                        "secretName": "database-credentials",
                        "items": [
                            {
                                "key": "username",
                                "path": "DATABASE_USER"
                            },
                            {
                                "key": "password",
                                "path": "DATABASE_PASSWORD"
                            }
                        ]
                    }
                }
            ]
        }
    });
  }

  variableSecret(props: ClusterProps){
    props.clusterMain.addResource('PodTestVarible', {
        "apiVersion": "v1",
        "kind": "Pod",
        "metadata": {
        "name": "pod-variable",
        "namespace": "octank"
        },
        "spec": {
        "containers": [
            {
            "name": "database",
            "image": "busybox",
            "command": [
                "/bin/sh"
            ],
            "args": [
                "-c",
                "echo DATABASE_USER =  $DATABASE_USER; echo DATABASE_PASSWROD = $DATABASE_PASSWORD; while true; do sleep 1; done"
            ],
            "env": [
                {
                "name": "DATABASE_USER",
                "valueFrom": {
                    "secretKeyRef": {
                    "name": "database-credentials",
                    "key": "username"
                    }
                }
                },
                {
                "name": "DATABASE_PASSWORD",
                "valueFrom": {
                    "secretKeyRef": {
                    "name": "database-credentials",
                    "key": "password"
                    }
                }
                }
            ]
            }
        ]
        }
    });
  }
}