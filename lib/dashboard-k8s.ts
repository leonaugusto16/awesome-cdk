import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');

export interface EksProps {
  vpc: ec2.IVpc,
  clusterRole: iam.IRole,
  nodeRole: iam.IRole
}
export class DashboardK8s extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id);
    
    const deployment = {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: "hello-kubernetes" },
        spec: {
            replicas: 3,
            selector: { matchLabels: appLabel },
            template: {
            metadata: { labels: appLabel },
            spec: {
                containers: [
                {
                    name: "hello-kubernetes",
                    image: "paulbouwer/hello-kubernetes:1.5",
                    ports: [ { containerPort: 8080 } ]
                }
                ]
            }
            }
        }
    }
  }
}