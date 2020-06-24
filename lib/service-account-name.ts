import * as cdk from '@aws-cdk/core';
import eks = require('@aws-cdk/aws-eks');

export interface PropsServiceAccount{
  clusterMain: eks.Cluster,
  serviceAccountName: string,
  namespace: string
}

export class ServiceAccountEks extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props?: PropsServiceAccount) {
    super(scope, id);
  }
  createServiceAccount(props: PropsServiceAccount){
        // create service account to pod use 
        const account = new eks.ServiceAccount(this, 'ServiceAccount', {
            cluster: props.clusterMain,
            name: props.serviceAccountName,
            namespace: props.namespace
        });

        return account;
  }
}