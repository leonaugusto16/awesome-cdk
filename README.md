# Welcome!
This project is a general test of the use of cdk, some features will be spread over branchs. In the master is what I tested last.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Create DashBoard

After the stack is deployed...

* Use the outputs to access the tokens and update your kubeconfig
* With kubectl apply k8s/dashboard
* Create proxy: kubectl proxy --port=8080 --disable-filter=true
* See page dashboard: http://127.0.0.1:8080/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#/login

## Execute example microservice

After the stack is deployed...
* Use the outputs to access the tokens and update your kubeconfig
* With kubectl apply k8s/example-microservice/ecsdemo-*
* Verify services and ELB domain
* Access page web

## Execute bitnami/nginx with helm

Only deploy stack...

Deploy Helm
```javascript
new eks.HelmChart(this, 'Webserver', {
    cluster: clusterMain,
    chart: 'nginx',
    repository: 'https://charts.bitnami.com/bitnami',
    namespace: 'default'
});
```
## Execute example liveness and readiness

**Liveness probes** are used in Kubernetes to know when a pod is alive or dead. A pod can be in a dead state for a variety of reasons; Kubernetes will kill and recreate the pod when a liveness probe does not pass.

Execute kubectl apply -f k8s/healthcheck/liveness-app.yml and kill the process kubectl exec -it liveness-app -- /bin/kill -s SIGUSR1 1

See events in container kubectl describe pod liveness-app

**Readiness probes** are used in Kubernetes to know when a pod is ready to serve traffic. Only when the readiness probe passes will a pod receive traffic from the service; if a readiness probe fails traffic will not be sent to the pod.

Apply deployment k8s/healthcheck/readiness-deployment.yaml
kubectl describe deployment readiness-deployment | grep Replicas:
Kill file healthcheck -> kubectl exec -it readiness-deployment-589b548d5-2txnp -- rm /tmp/healthy

kubectl describe deployment readiness-deployment | grep Replicas:
Replicas:               3 desired | 3 updated | 3 total | 2 available | 1 unavailable

Readiness does not restart the pod, it only removes it from external access.

## Execute example with Autoscaling

Automatic scaling in K8s comes in two forms:

* **Horizontal Pod Autoscaler (HPA)** scales the pods in a deployment or replica set. It is implemented as a K8s API resource and a controller. The controller manager queries the resource utilization against the metrics specified in each HorizontalPodAutoscaler definition. It obtains the metrics from either the resource metrics API (for per-pod resource metrics), or the custom metrics API (for all other metrics).

Deploy the Metrics Server: kubectl create namespace metrics

``` javascript 
new eks.HelmChart(this, 'metrics', {
    cluster: clusterMain,
    chart: 'metrics-server',
    repository: 'https://kubernetes-charts.storage.googleapis.com',
    namespace: 'metrics'
});
```
Metrics Server is a cluster-wide aggregator of resource usage data. These metrics will drive the scaling behavior of the deployments.

Apply project: kubectl apply k8s/scale-pods-hpa-sample

Create request to apache:
kubectl run -i --tty load-generator --image=busybox /bin/sh

Execute a while loop to continue getting http:///php-apache

while true; do wget -q -O - http://php-apache; done

Watch the HPA with the following command

kubectl get hpa -w

* **Cluster Autoscaler (CA)** a component that automatically adjusts the size of a Kubernetes Cluster so that all pods have a place to run and there are no unneeded nodes.

In EKS there are some ways to manage worker nodes, in which case you can use managed node groups or autoscaling. We implemented both types. The main difference between the two is the level of control and management over the nodes, while the managed node groups do not have action or immediate control of the EC2 instances with automatic update, autoscaling you have total control of the instances.

Using EKS with autoscaling there are two ways to scale your EC2 instances. Either use metrics from the autoscaling itself or use the k8s CA ([cluster-autoscaler](https://github.com/kubernetes/autoscaler)) . Lib [@arhea/aws-cdk-eks-cluster-autoscaler](https://www.npmjs.com/package/@arhea/aws-cdk-eks-cluster-autoscaler) is already prepared to implement this in the cluster, but I strongly recommend looking at the code and implementing it for greater control of the scaling of your instances. It is very simple to add manifests with eks + cdk.

Deploy stack and apply k8s/scale-instances-ca-sample. For details see ClusterAutoscaler how to scale.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Confused about how all the <a href="https://twitter.com/awscloud?ref_src=twsrc%5Etfw">@awscloud</a> container pieces fit together? Have a drawing! <a href="https://twitter.com/hashtag/awsreinvent?src=hash&amp;ref_src=twsrc%5Etfw">#awsreinvent</a> <a href="https://t.co/CxrCNZJVa6">pic.twitter.com/CxrCNZJVa6</a></p>&mdash; Abby Fuller (@abbyfuller) <a href="https://twitter.com/abbyfuller/status/1202016116580605952?ref_src=twsrc%5Etfw">December 4, 2019</a></blockquote>


## Execute example with RBAC

According to the official kubernetes docs:

Role-based access control (RBAC) is a method of regulating access to computer or network resources based on the roles of individual users within an enterprise.

The core logical components of RBAC are:

* Entity: A group, user, or service account (an identity representing an application that wants to execute certain operations (actions) and requires permissions to do so).

* Resource: A pod, service, or secret that the entity wants to access using the certain operations.

* Role: Used to define rules for the actions the entity can take on various resources.

* Role binding: This attaches (binds) a role to an entity, stating that the set of rules define the actions permitted by the attached entity on the specified resources. There are two types of Roles (Role, ClusterRole) and the respective bindings (RoleBinding, ClusterRoleBinding). These differentiate between authorization in a namespace or cluster-wide.

* Namespace: Namespaces are an excellent way of creating security boundaries, they also provide a unique scope for object names as the ‘namespace’ name implies. They are intended to be used in multi-tenant environments to create virtual kubernetes clusters on the same physical cluster.

* Aws-Auth: The aws-auth ConfigMap from the kube-system namespace must be edited in order to allow or new arn Groups. This file makes the mapping between IAM role and k8S RBAC rights. 

Deploy stack, exist a construct (iam-groups) responsible for creating groups of dev and admin, with specific rules for the group of dev. Create user and add to dev group in IAM.

## Execute example with IAM Service Account to Role Pods

In Kubernetes version 1.12, support was added for a new ProjectedServiceAccountToken feature, which is an OIDC JSON web token that also contains the service account identity, and supports a configurable audience.

Amazon EKS now hosts a public OIDC discovery endpoint per cluster containing the signing keys for the ProjectedServiceAccountToken JSON web tokens so external systems, like IAM, can validate and accept the Kubernetes-issued OIDC tokens.

OIDC federation access allows you to assume IAM roles via the Secure Token Service (STS), enabling authentication with an OIDC provider, receiving a JSON Web Token (JWT), which in turn can be used to assume an IAM role. Kubernetes, on the other hand, can issue so-called projected service account tokens, which happen to be valid OIDC JWTs for pods. Our setup equips each pod with a cryptographically-signed token that can be verified by STS against the OIDC provider of your choice to establish the pod’s identity

Summary: It will be necessary to connect IAM services with the k8s OIDC provider. This is not implemented in Cloudformation, but there is a paleative lambda solution that you can see [here](https://bambooengineering.io/configuring-eks-for-iam-oidc-using-cloudformation/), this solution is used in eks.ServiceAccount (CDK). This implementation is in lib/example-iam-service-account (Construct).

In the example, create a Service Account for our cluster (you can review this at Identity providers at IAM) and add a policy with permissions to list on S3. Together we have a pod with aws cli to test if the policy is respected. This implementation is similar to the task role in ECS.

## Execute example calico

### What is Calico?
Calico is an open source networking and network security solution for containers, virtual machines, and native host-based workloads. Calico supports a broad range of platforms including Kubernetes, OpenShift, Docker EE, OpenStack, and bare metal services.

Network policies allow you to define rules that determine what type of traffic is allowed to flow between different services. Using network policies you can also define rules to restrict traffic. They are a means to improve your cluster’s security.

First start the calico service in the cluster: 
``` bash
kubectl apply -f k8s/calico/calico.yaml
kubectl get daemonset calico-node --namespace=kube-system
```
Execute example stars in k8s/calico-resources:

* 00 - Create namespaces stars
* 10 - Deploy managemnet ui
* 20 - Deploy backend and frontend in starts
* 30 - Deploy client (Access ui to see all connections between pods)
* 40 - Create network policy to deny all access in client and stars (Access ui to see all connections blocked between pods, including blocked with ui)
* 50 - Allow access to management-ui with client and starts (No connections between pods, only with management-ui)
* 60 - Allow access client -> frontend and  frontend -> backend