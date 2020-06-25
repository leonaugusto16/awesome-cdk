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

## Execute example exposing service

By default, Docker uses host-private networking, so containers can talk to other containers only if they are on the same machine. In order for Docker containers to communicate across nodes, there must be allocated ports on the machine’s own IP address, which are then forwarded or proxied to the containers. This obviously means that containers must either coordinate which ports they use very carefully or ports must be allocated dynamically.

Coordinating ports across multiple developers is very difficult to do at scale and exposes users to cluster-level issues outside of their control. Kubernetes assumes that pods can communicate with other pods, regardless of which host they land on. We give every pod its own cluster-private-IP address so you do not need to explicitly create links between pods or map container ports to host ports. This means that containers within a Pod can all reach each other’s ports on localhost, and all pods in a cluster can see each other without NAT.

### Cluster IP

Apply k8s/example-exposing-service/00_run-my-nginx.yaml ...

Kubernetes supports 2 primary modes of finding a Service - environment variables and DNS. The former works out of the box while the latter requires the CoreDNS cluster addon.
 
 * Environment Variables: When a Pod runs on a Node, the kubelet adds a set of environment variables for each active Service. This introduces an ordering problem. 
    ``` s
    $ kubectl exec <YOUR_POD> -- printenv | grep SERVICE
    KUBERNETES_SERVICE_PORT_HTTPS=443
    MY_NGINX_SERVICE_HOST=172.20.165.84
    MY_NGINX_SERVICE_PORT=80
    KUBERNETES_SERVICE_HOST=172.20.0.1
    KUBERNETES_SERVICE_PORT=443
    ```
    ```s
    $ kubectl describe svc my-nginx
    Name:              my-nginx
    Namespace:         default
    Labels:            <none>
    Annotations:       kubectl.kubernetes.io/last-applied-configuration: ...
    Selector:          run=my-nginx
    Type:              ClusterIP
    IP:                172.20.165.84
    Port:              <unset>  80/TCP
    TargetPort:        80/TCP
    Endpoints:         10.0.0.4:80,10.0.0.52:80
    Session Affinity:  None
    Events:            <none>
    ```
* DNS: Kubernetes offers a DNS cluster addon Service that automatically assigns dns names to other Services. You can check if it’s running on your cluster:
    ```s
    $ kubectl get services kube-dns --namespace=kube-system

    NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
    kube-dns   ClusterIP   172.20.0.10    <none>        53/UDP,53/TCP   8m
    ```
    Test dns internal...
    ```s
    $ kubectl run curl --image=radial/busyboxplus:curl -i --tty
    (container) $ nslookup my-nginx
    Server:    172.20.0.10
    Address 1: 172.20.0.10 kube-dns.kube-system.svc.cluster.local

    Name:      my-nginx
    Address 1: 172.20.165.84 my-nginx.default.svc.cluster.local
    (container) $ wget -q -O - my-nginx --> OK
    ```
### External IP 
Currently the Service does not have an External IP, so let’s now recreate the Service to use a cloud load balancer, just change the Type of my-nginx Service from ClusterIP to LoadBalancer.

Apply examples in k8s/example-exposing-service/example-cluster-ip ...

The IP address in the EXTERNAL-IP column is the one that is available on the public internet. The CLUSTER-IP is only available inside your cluster/private cloud network.

### Ingress

What is Ingress? Ingress, added in Kubernetes v1.1, exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. Traffic routing is controlled by rules defined on the Ingress resource.

```s
Internet---[ Ingress ]--|--|--[ Services ]
```

An Ingress can be configured to give services externally-reachable URLs, load balance traffic, terminate SSL, and offer name based virtual hosting. An Ingress controller is responsible for fulfilling the Ingress, usually with a loadbalancer, though it may also configure your edge router or additional frontends to help handle the traffic.

An Ingress does not expose arbitrary ports or protocols. Exposing services other than HTTP and HTTPS to the internet typically uses a service of type NodePort or LoadBalancer.

The alb needs a service account with specific permissions to be able to execute requests to AWS. In addition to a deployment to run on the cluster, this part is implemented in lib/alb-ingress-controller.

Use a example with 2048 for tests ... Apply k8s/example-exposing-service/example-alb-ingress-controller 

## Assigning pods to nodes

You can constrain a pod to only be able to run on particular nodes or to prefer to run on particular nodes.

Generally such constraints are unnecessary, as the scheduler will automatically do a reasonable placement (e.g. spread your pods across nodes, not place the pod on a node with insufficient free resources, etc.) but there are some circumstances where you may want more control on a node where a pod lands, e.g. to ensure that a pod ends up on a machine with an SSD attached to it, or to co-locate pods from two different services that communicate a lot into the same availability zone

### NodeSelector

nodeSelector is the simplest recommended form of node selection constraint. nodeSelector is a field of PodSpec. It specifies a map of key-value pairs. For the pod to be eligible to run on a node, the node must have each of the indicated key-value pairs as labels (it can have additional labels as well). The most common usage is one key-value pair.

For example, can put a label on a node
```s
$ kubectl label nodes <NODE> disktype=ssd
$ kubectl get nodes --show-labels
```
Apply example in k8s/example-nodeselector, see the node that the pod was launched (kubectl get pods -o wide)

### Affinity and anti-affinity

NodeSelector provides a very simple way to constrain pods to nodes with particular labels. The affinity/anti-affinity feature, currently in beta, greatly extends the types of constraints you can express. The key enhancements are:

* The language is more expressive (not just “AND of exact match”)
* You can indicate that the rule is “soft”/“preference” rather than a hard requirement, so if the scheduler can’t satisfy it, the pod will still be scheduled
* You can constrain against labels on other pods running on the node (or other topological domain), rather than against labels on the node itself, which allows rules about which pods can and cannot be co-located

The affinity feature consists of two types of affinity, “node affinity” and “inter-pod affinity/anti-affinity”. Node affinity is like the existing nodeSelector (but with the first two benefits listed above), while inter-pod affinity/anti-affinity constrains against pod labels rather than node labels, as described in the third item listed above, in addition to having the first and second properties listed above.

#### Node affinity (beta feature)

Node affinity was introduced as alpha in Kubernetes 1.2. Node affinity is conceptually similar to nodeSelector – it allows you to constrain which nodes your pod is eligible to be scheduled on, based on labels on the node.

There are currently two types of node affinity, called **requiredDuringSchedulingIgnoredDuringExecution** and **preferredDuringSchedulingIgnoredDuringExecution**.

You can think of them as “hard” and “soft” respectively, in the sense that the former specifies rules that must be met for a pod to be scheduled onto a node (just like nodeSelector but using a more expressive syntax), while the latter specifies preferences that the scheduler will try to enforce but will not guarantee. The “IgnoredDuringExecution” part of the names means that, similar to how nodeSelector works, if labels on a node change at runtime such that the affinity rules on a pod are no longer met, the pod will still continue to run on the node.

Thus an example of requiredDuringSchedulingIgnoredDuringExecution would be “only run the pod on nodes with Intel CPUs” and an example preferredDuringSchedulingIgnoredDuringExecution would be “try to run this set of pods in availability zone XYZ, but if it’s not possible, then allow some to run elsewhere”.

For example, can put a label on a node
```s
$ kubectl label nodes <SAME_NODE> azname=az1
$ kubectl get nodes --show-labels
```
Apply example in k8s/example-node-affinity, see the node that the pod was launched (kubectl get pods -o wide). 

#### More practical use-cases

In a three node cluster, a web application has in-memory cache such as redis. We want the web-servers to be co-located with the cache as much as possible.

See and apply example k8s/example-real-node-affinity. 

## Spot Instances

We have our EKS Cluster and worker nodes already, but we need some Spot Instances configured as workers. We also need a Node Labeling strategy to identify which instances are Spot and which are on-demand so that we can make more intelligent scheduling decisions.

Using asg we can add the spot price (cdk), but this way we have a limitation in the instance family. See example k8s/spot-worker-nodes/eks-workshop-ng-spot.yaml. 

During the creation of the Node Group, we have configured a node-label so that kubernetes knows what type of nodes we have provisioned. We set the lifecycle for the nodes as Ec2Spot. We are also tainting with PreferNoSchedule to prefer pods not be scheduled on Spot Instances. This is a “preference” or “soft” version of NoSchedule – the system will try to avoid placing a pod that does not tolerate the taint on the node, but it is not required.

But this solution would only work if the cluster was created with eksctl, which isn't the case. In this case it makes more sense to add more capacity in the cluster with multiple families of instances. If you have a label rule you can add it to kubeletExtraArgs.

```javascript
    cluster.addCapacity('spot', {
    instanceType: new ec2.InstanceType('t3.large'),
    minCapacity: 2,
    bootstrapOptions: {
        kubeletExtraArgs: '--node-labels foo=bar,goo=far',
        awsApiRetryAttempts: 5
    }
    });
```

See labels ...
```s
$ kubectl get nodes --label-columns=lifecycle --selector=lifecycle=Ec2Spot
$ kubectl get nodes --label-columns=lifecycle --selector=lifecycle=OnDemand
```

**TODO: Test scaling without spot in market**

### AWS Node Termination Handler

Demand for Spot Instances can vary significantly, and as a consequence the availability of Spot Instances will also vary depending on how many unused EC2 instances are available. It is always possible that your Spot Instance might be interrupted. In this case the Spot Instances are sent an interruption notice two minutes ahead to gracefully wrap up things. We will deploy a pod on each spot instance to detect and redeploy applications elsewhere in the cluster.

The first thing that we need to do is deploy the AWS Node Termination Handler on each Spot Instance. This will monitor the EC2 metadata service on the instance for an interruption notice. The termination handler consists of a ServiceAccount, ClusterRole, ClusterRoleBinding, and a DaemonSet.

The workflow can be summarized as:

* Identify that a Spot Instance is being reclaimed.
* Use the 2-minute notification window to gracefully prepare the node for termination.
* Taint the node and cordon it off to prevent new pods from being placed.
* Drain connections on the running pods.
* Replace the pods on remaining nodes to maintain the desired capacity.

### Deploy Application

We are redesigning our Microservice example and want our frontend service to be deployed on Spot Instances when they are available. We will use Node Affinity in our manifest file to configure this.

See k8s/example-microservice-spot/ecs-demo-frontend

The spec to configure NodeAffinity to prefer Spot Instances, but not require them. This will allow the pods to be scheduled on On-Demand nodes if no spot instances were available or correctly labelled. We also want to configure a toleration which will allow the pods to “tolerate” the taint that we configured on our EC2 Spot Instances.

## Advanced VPC

### Secondary CIDRS

You can expand your VPC network by adding additional CIDR ranges. This capability can be used if you are running out of IP ranges within your existing VPC or if you have consumed all available RFC 1918 CIDR ranges within your corporate network. EKS supports additional IPv4 CIDR blocks in the 100.64.0.0/10 and 198.19.0.0/16 ranges.

**TODO: Not implemented**