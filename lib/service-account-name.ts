import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');

export class ServiceAccountEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

  }
  createServiceAccount(clusterMain: eks.Cluster){
        // create service account to pod use 
        const account = new eks.ServiceAccount(this, 'ServiceAccount', {
            cluster: clusterMain,
            name: 'eks-test-service-account',
            namespace: 'default'
        });

        return account;
  }
}