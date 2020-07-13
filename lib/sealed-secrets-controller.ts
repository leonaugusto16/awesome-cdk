import * as cdk from '@aws-cdk/core';
import kms = require('@aws-cdk/aws-kms');
import eks = require('@aws-cdk/aws-eks');

export interface ClusterProps{
    clusterMain: eks.Cluster
}

export class SealedSecretsEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ClusterProps) {
    super(scope, id);
    
    const namespace = props.clusterMain.addResource('NamespaceSealed',{
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": "octank"
        }
      });

    const secret = props.clusterMain.addResource('SecretSealed',{
        "apiVersion": "bitnami.com/v1alpha1",
        "kind": "SealedSecret",
        "metadata": {
          "creationTimestamp": null,
          "name": "database-credentials",
          "namespace": "octank"
        },
        "spec": {
          "encryptedData": {
            "password": "AgDVGJ+bThUdRoWbUxbMw0+lPehetzxaglMowTiSa7bZABUfdhZUc5E4jxs4Jmljc6qJpWgm0WbthgmFdugS65eHVp8/d54/YMAsyqxhok7DVFptSsQkCP1lRCqbTNr02stMGxCyG58HQvywPWx0frhU18Hfi9hX20KjjMR3Vyy91rXmG10O6q+vPCYl3yHUt2EiSASsb0hAYr7YYjoGwwBLb8MLpfsAeV6VMkKXidVQDp4KnKtpjwGZi3V1vkPfFjpYdYhXTuCEAhLuIV9a4j45cggW7uwSWSuAewMHZcS53+FJicnl/ySV043p1ASUxEt1vJ52073uMUTuuD+Q+l49iO3odVghGHJN+6fuuPK0zaVv96L+t7ojMVVX64LJAik8dnWZHseUTtWIMTAhXxdI4p8aykZ6F3dXQQVbOfu/TjchfkFfiG58nC9e8AP3+/QFJdPbV5TpQWYG6YfmfMuelRpzhNqP3viAQJ0gjGqt6dJn6uiuJVvxvKcCrneLhYvr1C3ri9U2tqfI2mOEfozsTeOTjqcl5Z5Q1xSdYk7EAB0HxQcCFFDkH8ZRrbd8AfFH3j/ScwvADbIcYXdWd4OyiT/rh3ZH3hBzaaQwd0coNUMI1Muf9Cl2QsUMBMCWLPAXG/tVCBzX3nFwmbUTWi4iOLeDcqDkHGMoZ83NDswYWTzjVEl3g6qVqUXNUTfM3TIpZd1HPCtdDQ==",
            "username": "AgAPZASgrpu2WL3wNBFR/F5G6Q6R7C44XM389qkqu1clgphurZCgkq5YMLpW/dFt/ucTXrDZjLsl+TtwI8ec4CB2pNmruxtzo2vPWmDzqWfax/U/OdcxsdaZsmEFLjSTnMPuORoqZmO+TqJ9zNsDXTmkwmANyz4lcTwvwAhjHNDkg3sHJ0z88Nt2iDvPFMaUBqiLnZKkI5dFGnuul+GydOlkZ3h2VKN2c1Szu5nWOJanM+vcumnNsYXbM/SRjz41EUKDwM+lg9tJPNo20LFsYA8LGubqnW0SI4Upnrkx7As3iscBHyAjZr0cgdxH4j2C4mPCaR/1bHWoRak8kNojqfxWoD1NMwDo2geWDZp/krXBJs8066K5lXLbX1kEh6Ba1r4poG5/llEla+M2+MCQ9Sk+hr0Fa9hzP0jjjizN1+hB/o4OG+ywSF4NAzjUSJTIk3MXeDznzL3qvgIxMK+cWtfC8+4r57Gwh1T8BmrZ/mQO4uPl2Buo68SFYmFHJcQlJlBg6Ha2pIBZE5vU9jVLfkA8/1an0hn9DkMPgNAcvMzwel+vxQjHmW321WHOy9gQPYvalkaYLxhcWPF9zghUsGySanBF9zhWnf+qbILxaHEZfNIdJd0Zer3kLIxRDeJGhctKtHjV8pDOCyzQBqqQgtZ/dYFtchYI3kcrxnikS5gh63n9aUjAKpD07GoNcvtN/RC4W4ANDQ=="
          },
          "template": {
            "metadata": {
              "creationTimestamp": null,
              "name": "database-credentials",
              "namespace": "octank"
            },
            "type": "Opaque"
          }
        },
        "status": {}
    });
    secret.node.addDependency(namespace)

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