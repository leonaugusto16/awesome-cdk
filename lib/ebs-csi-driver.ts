import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam');

import { loadManifestYaml } from './utils/readManifests';

export interface ClusterProps{
    clusterMain: eks.Cluster,
}

export class EbsCsiControllerEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);

    const accountIrsa = new eks.ServiceAccount(this, 'ServiceAccountEbsCsi', {
        cluster: props.clusterMain,
        name: 'ebs-csi-controller-irsa', // Same Service Account in ebs-csi-driver.yaml 
        namespace: 'kube-system'
    });

    accountIrsa.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ["ec2:AttachVolume",
        "ec2:CreateSnapshot",
        "ec2:CreateTags",
        "ec2:CreateVolume",
        "ec2:DeleteSnapshot",
        "ec2:DeleteTags",
        "ec2:DeleteVolume",
        "ec2:DescribeInstances",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeVolumes",
        "ec2:DetachVolume"]
    }));

    const accountSa = 'ebs-csi-controller-sa'
    props.clusterMain.addResource('ServiceAccountEBS',{
      "apiVersion": "v1",
      "kind": "ServiceAccount",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": accountSa,
        "namespace": "kube-system"
      }
    });

    props.clusterMain.addResource('ClusterRoleEBS',{
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRole",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-external-attacher-role"
      },
      "rules": [
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "persistentvolumes"
          ],
          "verbs": [
            "get",
            "list",
            "watch",
            "update"
          ]
        },
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "nodes"
          ],
          "verbs": [
            "get",
            "list",
            "watch"
          ]
        },
        {
          "apiGroups": [
            "csi.storage.k8s.io"
          ],
          "resources": [
            "csinodeinfos"
          ],
          "verbs": [
            "get",
            "list",
            "watch"
          ]
        },
        {
          "apiGroups": [
            "storage.k8s.io"
          ],
          "resources": [
            "volumeattachments"
          ],
          "verbs": [
            "get",
            "list",
            "watch",
            "update"
          ]
        }
      ]
    });

    props.clusterMain.addResource('ClusterRoleEBS2',{
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRole",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-external-provisioner-role"
      },
      "rules": [
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "persistentvolumes"
          ],
          "verbs": [
            "get",
            "list",
            "watch",
            "create",
            "delete"
          ]
        },
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "persistentvolumeclaims"
          ],
          "verbs": [
            "get",
            "list",
            "watch",
            "update"
          ]
        },
        {
          "apiGroups": [
            "storage.k8s.io"
          ],
          "resources": [
            "storageclasses"
          ],
          "verbs": [
            "get",
            "list",
            "watch"
          ]
        },
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "events"
          ],
          "verbs": [
            "list",
            "watch",
            "create",
            "update",
            "patch"
          ]
        },
        {
          "apiGroups": [
            "snapshot.storage.k8s.io"
          ],
          "resources": [
            "volumesnapshots"
          ],
          "verbs": [
            "get",
            "list"
          ]
        },
        {
          "apiGroups": [
            "snapshot.storage.k8s.io"
          ],
          "resources": [
            "volumesnapshotcontents"
          ],
          "verbs": [
            "get",
            "list"
          ]
        },
        {
          "apiGroups": [
            "storage.k8s.io"
          ],
          "resources": [
            "csinodes"
          ],
          "verbs": [
            "get",
            "list",
            "watch"
          ]
        },
        {
          "apiGroups": [
            ""
          ],
          "resources": [
            "nodes"
          ],
          "verbs": [
            "get",
            "list",
            "watch"
          ]
        },
        {
          "apiGroups": [
            "coordination.k8s.io"
          ],
          "resources": [
            "leases"
          ],
          "verbs": [
            "get",
            "watch",
            "list",
            "delete",
            "update",
            "create"
          ]
        }
      ]
    });

    props.clusterMain.addResource('ClusterRoleBindingEBS',{
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRoleBinding",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-csi-attacher-binding"
      },
      "roleRef": {
        "apiGroup": "rbac.authorization.k8s.io",
        "kind": "ClusterRole",
        "name": "ebs-external-attacher-role"
      },
      "subjects": [
        {
          "kind": "ServiceAccount",
          "name": accountIrsa.serviceAccountName,
          "namespace": "kube-system"
        }
      ]
    });
    
    props.clusterMain.addResource('ClusterRoleBindingEBS2',{
      "apiVersion": "rbac.authorization.k8s.io/v1",
      "kind": "ClusterRoleBinding",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-csi-provisioner-binding"
      },
      "roleRef": {
        "apiGroup": "rbac.authorization.k8s.io",
        "kind": "ClusterRole",
        "name": "ebs-external-provisioner-role"
      },
      "subjects": [
        {
          "kind": "ServiceAccount",
          "name": accountIrsa.serviceAccountName,
          "namespace": "kube-system"
        }
      ]
    });

    props.clusterMain.addResource('DeploymentEBS',{
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-csi-controller",
        "namespace": "kube-system"
      },
      "spec": {
        "replicas": 2,
        "selector": {
          "matchLabels": {
            "app": "ebs-csi-controller",
            "app.kubernetes.io/name": "aws-ebs-csi-driver"
          }
        },
        "template": {
          "metadata": {
            "labels": {
              "app": "ebs-csi-controller",
              "app.kubernetes.io/name": "aws-ebs-csi-driver"
            }
          },
          "spec": {
            "containers": [
              {
                "args": [
                  "--endpoint=$(CSI_ENDPOINT)",
                  "--logtostderr",
                  "--v=5"
                ],
                "env": [
                  {
                    "name": "CSI_ENDPOINT",
                    "value": "unix:///var/lib/csi/sockets/pluginproxy/csi.sock"
                  },
                  {
                    "name": "AWS_ACCESS_KEY_ID",
                    "valueFrom": {
                      "secretKeyRef": {
                        "key": "key_id",
                        "name": "aws-secret",
                        "optional": true
                      }
                    }
                  },
                  {
                    "name": "AWS_SECRET_ACCESS_KEY",
                    "valueFrom": {
                      "secretKeyRef": {
                        "key": "access_key",
                        "name": "aws-secret",
                        "optional": true
                      }
                    }
                  }
                ],
                "image": "amazon/aws-ebs-csi-driver:v0.5.0",
                "imagePullPolicy": "IfNotPresent",
                "livenessProbe": {
                  "failureThreshold": 5,
                  "httpGet": {
                    "path": "/healthz",
                    "port": "healthz"
                  },
                  "initialDelaySeconds": 10,
                  "periodSeconds": 10,
                  "timeoutSeconds": 3
                },
                "name": "ebs-plugin",
                "ports": [
                  {
                    "containerPort": 9808,
                    "name": "healthz",
                    "protocol": "TCP"
                  }
                ],
                "volumeMounts": [
                  {
                    "mountPath": "/var/lib/csi/sockets/pluginproxy/",
                    "name": "socket-dir"
                  }
                ]
              },
              {
                "args": [
                  "--csi-address=$(ADDRESS)",
                  "--v=5",
                  "--feature-gates=Topology=true",
                  "--enable-leader-election",
                  "--leader-election-type=leases"
                ],
                "env": [
                  {
                    "name": "ADDRESS",
                    "value": "/var/lib/csi/sockets/pluginproxy/csi.sock"
                  }
                ],
                "image": "quay.io/k8scsi/csi-provisioner:v1.3.0",
                "name": "csi-provisioner",
                "volumeMounts": [
                  {
                    "mountPath": "/var/lib/csi/sockets/pluginproxy/",
                    "name": "socket-dir"
                  }
                ]
              },
              {
                "args": [
                  "--csi-address=$(ADDRESS)",
                  "--v=5",
                  "--leader-election=true",
                  "--leader-election-type=leases"
                ],
                "env": [
                  {
                    "name": "ADDRESS",
                    "value": "/var/lib/csi/sockets/pluginproxy/csi.sock"
                  }
                ],
                "image": "quay.io/k8scsi/csi-attacher:v1.2.0",
                "name": "csi-attacher",
                "volumeMounts": [
                  {
                    "mountPath": "/var/lib/csi/sockets/pluginproxy/",
                    "name": "socket-dir"
                  }
                ]
              },
              {
                "args": [
                  "--csi-address=/csi/csi.sock"
                ],
                "image": "quay.io/k8scsi/livenessprobe:v1.1.0",
                "name": "liveness-probe",
                "volumeMounts": [
                  {
                    "mountPath": "/csi",
                    "name": "socket-dir"
                  }
                ]
              }
            ],
            "nodeSelector": {
              "kubernetes.io/arch": "amd64",
              "kubernetes.io/os": "linux"
            },
            "priorityClassName": "system-cluster-critical",
            "serviceAccountName": accountIrsa.serviceAccountName,
            "tolerations": [
              {
                "operator": "Exists"
              }
            ],
            "volumes": [
              {
                "emptyDir": {
                },
                "name": "socket-dir"
              }
            ]
          }
        }
      }
    });

    props.clusterMain.addResource('DaemonSetEBS',{
      "apiVersion": "apps/v1",
      "kind": "DaemonSet",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs-csi-node",
        "namespace": "kube-system"
      },
      "spec": {
        "selector": {
          "matchLabels": {
            "app": "ebs-csi-node",
            "app.kubernetes.io/name": "aws-ebs-csi-driver"
          }
        },
        "template": {
          "metadata": {
            "labels": {
              "app": "ebs-csi-node",
              "app.kubernetes.io/name": "aws-ebs-csi-driver"
            }
          },
          "spec": {
            "affinity": {
              "nodeAffinity": {
                "requiredDuringSchedulingIgnoredDuringExecution": {
                  "nodeSelectorTerms": [
                    {
                      "matchExpressions": [
                        {
                          "key": "eks.amazonaws.com/compute-type",
                          "operator": "NotIn",
                          "values": [
                            "fargate"
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            },
            "containers": [
              {
                "args": [
                  "node",
                  "--endpoint=$(CSI_ENDPOINT)",
                  "--logtostderr",
                  "--v=5"
                ],
                "env": [
                  {
                    "name": "CSI_ENDPOINT",
                    "value": "unix:/csi/csi.sock"
                  }
                ],
                "image": "amazon/aws-ebs-csi-driver:v0.5.0",
                "livenessProbe": {
                  "failureThreshold": 5,
                  "httpGet": {
                    "path": "/healthz",
                    "port": "healthz"
                  },
                  "initialDelaySeconds": 10,
                  "periodSeconds": 10,
                  "timeoutSeconds": 3
                },
                "name": "ebs-plugin",
                "ports": [
                  {
                    "containerPort": 9808,
                    "name": "healthz",
                    "protocol": "TCP"
                  }
                ],
                "securityContext": {
                  "privileged": true
                },
                "volumeMounts": [
                  {
                    "mountPath": "/var/lib/kubelet",
                    "mountPropagation": "Bidirectional",
                    "name": "kubelet-dir"
                  },
                  {
                    "mountPath": "/csi",
                    "name": "plugin-dir"
                  },
                  {
                    "mountPath": "/dev",
                    "name": "device-dir"
                  }
                ]
              },
              {
                "args": [
                  "--csi-address=$(ADDRESS)",
                  "--kubelet-registration-path=$(DRIVER_REG_SOCK_PATH)",
                  "--v=5"
                ],
                "env": [
                  {
                    "name": "ADDRESS",
                    "value": "/csi/csi.sock"
                  },
                  {
                    "name": "DRIVER_REG_SOCK_PATH",
                    "value": "/var/lib/kubelet/plugins/ebs.csi.aws.com/csi.sock"
                  }
                ],
                "image": "quay.io/k8scsi/csi-node-driver-registrar:v1.1.0",
                "lifecycle": {
                  "preStop": {
                    "exec": {
                      "command": [
                        "/bin/sh",
                        "-c",
                        "rm -rf /registration/ebs.csi.aws.com-reg.sock /csi/csi.sock"
                      ]
                    }
                  }
                },
                "name": "node-driver-registrar",
                "volumeMounts": [
                  {
                    "mountPath": "/csi",
                    "name": "plugin-dir"
                  },
                  {
                    "mountPath": "/registration",
                    "name": "registration-dir"
                  }
                ]
              },
              {
                "args": [
                  "--csi-address=/csi/csi.sock"
                ],
                "image": "quay.io/k8scsi/livenessprobe:v1.1.0",
                "name": "liveness-probe",
                "volumeMounts": [
                  {
                    "mountPath": "/csi",
                    "name": "plugin-dir"
                  }
                ]
              }
            ],
            "hostNetwork": true,
            "nodeSelector": {
              "kubernetes.io/arch": "amd64",
              "kubernetes.io/os": "linux"
            },
            "priorityClassName": "system-node-critical",
            "tolerations": [
              {
                "operator": "Exists"
              }
            ],
            "volumes": [
              {
                "hostPath": {
                  "path": "/var/lib/kubelet",
                  "type": "Directory"
                },
                "name": "kubelet-dir"
              },
              {
                "hostPath": {
                  "path": "/var/lib/kubelet/plugins/ebs.csi.aws.com/",
                  "type": "DirectoryOrCreate"
                },
                "name": "plugin-dir"
              },
              {
                "hostPath": {
                  "path": "/var/lib/kubelet/plugins_registry/",
                  "type": "Directory"
                },
                "name": "registration-dir"
              },
              {
                "hostPath": {
                  "path": "/dev",
                  "type": "Directory"
                },
                "name": "device-dir"
              }
            ]
          }
        }
      }
    });

    props.clusterMain.addResource('CSIDriverEBS',{
      "apiVersion": "storage.k8s.io/v1beta1",
      "kind": "CSIDriver",
      "metadata": {
        "labels": {
          "app.kubernetes.io/name": "aws-ebs-csi-driver"
        },
        "name": "ebs.csi.aws.com",
        "namespace": "kube-system"
      },
      "spec": {
        "attachRequired": true,
        "podInfoOnMount": false
      }
    });


  }  
}