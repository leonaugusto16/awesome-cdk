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

## Stateful Containers

StatefulSet manages the deployment and scaling of a set of Pods, and provides guarantees about the ordering and uniqueness of these Pods, suitable for applications that require one or more of the following. * Stable, unique network identifiers * Stable, persistent storage * Ordered, graceful deployment and scaling * Ordered, automated rolling updates

On Amazon EKS, the open-source EBS Container Storage Interface (CSI) driver is used to manage the attachment of Amazon EBS block storage volumes to Kubernetes Pods.
```s
$ kubectl kustomize github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=master > ebs-csi-driver.yaml --> Migrate to lib/ebs-csi-driver.ts
```

### Storage Class

Dynamic Volume Provisioning allows storage volumes to be created on-demand. StorageClass should be pre-created to define which provisioner should be used and what parameters should be passed when dynamic provisioning is invoked.

### Config Map

ConfigMap allow you to decouple configuration artifacts and secrets from image content to keep containerized applications portable. Using ConfigMap, you can independently control MySQL configuration.

### Services

Kubernetes Service defines a logical set of Pods and a policy by which to access them. Service can be exposed in different ways by specifying a type in the serviceSpec. StatefulSet currently requires a Headless Service to control the domain of its Pods, directly reach each Pod with stable DNS entries. By specifying “None” for the clusterIP, you can create Headless Service.

### Statefulset

StatefulSet consists of serviceName, replicas, template and volumeClaimTemplates: * serviceName is “mysql”, headless service we created in previous section * replicas is 3, the desired number of pod * template is the configuration of pod * volumeClaimTemplates is to claim volume for pod based on storageClassName, mysql-gp2 that we created in the Define Storageclass section.

Apply Driver EBS with lib/ebscsi-driver.ts
Apply project in k8s/example-storage-class

## EKS Fargate

AWS Fargate is a technology that provides on-demand, right-sized compute capacity for containers. With AWS Fargate, you no longer have to provision, configure, or scale groups of virtual machines to run containers. This removes the need to choose server types, decide when to scale your node groups, or optimize cluster packing. You can control which pods start on Fargate and how they run with Fargate profiles, which are defined as part of your Amazon EKS cluster.

### Fargate Profile

The Fargate profile allows an administrator to declare which pods run on Fargate. Each profile can have up to five selectors that contain a namespace and optional labels. You must define a namespace for every selector. The label field consists of multiple optional key-value pairs. Pods that match a selector (by matching a namespace for the selector and all of the labels specified in the selector) are scheduled on Fargate.

It is generally a good practice to deploy user application workloads into namespaces other than kube-system or default so that you have more fine-grained capabilities to manage the interaction between your pods deployed on to EKS.

Fargate profiles are immutable. However, you can create a new updated profile to replace an existing profile and then delete the original after the updated profile has finished creating

```javascript
cluster.addFargateProfile('MyProfile', {
  selectors: [ { namespace: '2048-game' } ]
});
```

When your EKS cluster schedules pods on Fargate, the pods will need to make calls to AWS APIs on your behalf to do things like pull container images from Amazon ECR. The Fargate Pod Execution Role provides the IAM permissions to do this. This IAM role is automatically created for you by the above command.

Notice that the profile includes the private subnets in your EKS cluster. Pods running on Fargate are not assigned public IP addresses, so only private subnets (with no direct route to an Internet Gateway) are supported when you create a Fargate profile. Hence, while provisioning an EKS cluster, you must make sure that the VPC that you create contains one or more private subnets.

NOTE: Classic Load Balancers and Network Load Balancers are not supported on pods running on Fargate. For ingress, we recommend that you use the ALB Ingress Controller on Amazon EKS (minimum version v1.1.4).

See in construct lib/fargate-profile.ts, implement profile fargate in specific namespace. Now, apply project k8s/example-2048-fargate. In the example we have 5 replicates, so we will have to go up 5 instances in the fargate. Every deploy in that namespace will be fargate!

```s
$ kubectl get nodes
NAME                                               STATUS   ROLES    AGE    VERSION
fargate-ip-10-0-0-141.us-east-2.compute.internal   Ready    <none>   35s    v1.16.8-eks-e16311
fargate-ip-10-0-0-158.us-east-2.compute.internal   Ready    <none>   39s    v1.16.8-eks-e16311
fargate-ip-10-0-0-166.us-east-2.compute.internal   Ready    <none>   31s    v1.16.8-eks-e16311
fargate-ip-10-0-0-182.us-east-2.compute.internal   Ready    <none>   31s    v1.16.8-eks-e16311
fargate-ip-10-0-0-185.us-east-2.compute.internal   Ready    <none>   30s    v1.16.8-eks-e16311
ip-10-0-0-138.us-east-2.compute.internal           Ready    <none>   118m   v1.14.9-eks-49202c
ip-10-0-0-187.us-east-2.compute.internal           Ready    <none>   118m   v1.14.9-eks-49202c
ip-10-0-0-82.us-east-2.compute.internal            Ready    <none>   119m   v1.14.9-eks-49202c
```
Notice that the pods have been directly registered with the load balancer whereas when we worked with worker nodes in an earlier lab, the IP address of the worker nodes and the NodePort were registered as targets. The latter case is the Instance Mode where Ingress traffic starts at the ALB and reaches the Kubernetes worker nodes through each service’s NodePort and subsequently reaches the pods through the service’s ClusterIP. While running under Fargate, ALB operates in IP Mode, where Ingress traffic starts at the ALB and reaches the Kubernetes pods directly.

NOTE: Created a construct to use the alb-controller helm in this example, be careful with Role's permissions, it changes from version to version of ALB. Don't forget to delete the ingress, it is not part of the cdk resources. Otherwise, won't be able to remove the vpc because the ALB will be attached to it.

## Stateful EFS

Amazon Elastic File System (Amazon EFS) provides a simple, scalable, fully managed elastic NFS file system for use with AWS Cloud services and on-premises resources. It is built to scale on demand to petabytes without disrupting applications, growing and shrinking automatically as you add and remove files, eliminating the need to provision and manage capacity to accommodate growth.

Amazon EFS supports the Network File System version 4 (NFSv4.1 and NFSv4.0) protocol, so the applications and tools that you use today work seamlessly with Amazon EFS. Multiple Amazon EC2 instances can access an Amazon EFS file system at the same time, providing a common data source for workloads and applications running on more than one instance or server.

The EFS Provisioner is deployed as a Pod that has a container with access to an AWS EFS file system. Deploy in lib/efs-controller.ts, the construct creates an EFS filesystem with connections to the node groups and the new user data to mount the partition. The construct starts Provisioner by the helm, creates a Storageclass and PVC to connect the pod to the partition. 

## Spot.io

Amazon EC2 Spot Instances offer AWS customers up to 90% cost savings in comparison to On-Demand Instances. However, they can be interrupted with a 2 minute warning when EC2 needs the capacity back. While this itself does not pose any issue for stateless workloads such as those typically running on Amazon EKS, managing larger clusters running Spot Instances as worker nodes on your own, does require a large amount of manual configuration, setup and maintenance.

For AWS customers looking for a turn-key solution that doesn’t require significant time and effort, Ocean abstracts the nitty-gritty, EKS infrastructure management and provides an enterprise-level SLA for high availability, and data persistence.

The result is that your EKS cluster will automatically run on an optimal blend of Spot Instances, Savings Plans and Reserved Instances as well as On-Demand when needed, so you can focus on higher value activities.

See https://www.eksworkshop.com/beginner/190_ocean/

## Kubernetes Secrets

Kubernetes can store secrets that pods can access via a mounted volume. Today, Kubernetes secrets are stored with Base64 encoding, but security teams would prefer a stronger approach. Amazon EKS clusters version 1.13 and higher support the capability of encrypting your Kubernetes secrets using AWS Key Management Service (KMS) Customer Managed Keys (CMK). No changes in the way you are using secrets are required. The only requirement is to enable the encryption provider support during EKS cluster creation.

The workflow is as follows:

* The user (typically in an admin role) creates a secret.
* The Kubernetes API server in the EKS control plane generates a Data Encryption Key (DEK) locally and uses it to encrypt the plaintext payload in the secret. Note that the control plane generates a unique DEK for every single write, and the plaintext DEK is never saved to disk.
* The Kubernetes API server calls kms:Encrypt to encrypt the DEK with the CMK. This key is the root of the key hierarchy, and, in the case of KMS, it creates the CMK on a hardware security module (HSM). In this step, the API server uses the CMK to encrypt the DEK and also caches the base64 of the encrypted DEK.
* The API server stores the DEK-encrypted secret in etcd.
* If one now wants to use the secret in, say a pod via a volume (read-path), the reverse process takes place. That is, the API server reads the encrypted secret from etcd and decrypts the secret with the DEK.
* The application, running in a pod on either EC2 or Fargate, can then consume the secret as usual.

For most users, the default AWS KMS key store, which is protected by [FIPS 140-2](https://aws.amazon.com/blogs/security/aws-key-management-service-now-offers-fips-140-2-validated-cryptographic-modules-enabling-easier-adoption-of-the-service-for-regulated-workloads/) validated cryptographic modules, fulfills their security requirements. FIPS 140-2 Level 2 validation is sufficient for many use cases, but check with your security and compliance teams to verify.

Keep in mind that the KMS Custom Key Store functionality makes use of a minimum of two AWS CloudHSM instances.

Deploy the construct lib/kms-controller.ts to create a namespace, secret and a test pod

## Sealed Secrets

Kubernetes Secret is a resource that helps cluster operators manage the deployment of sensitive information such as passwords, OAuth tokens, and ssh keys etc. These Secrets can be mounted as data volumes or exposed as environment variables to the containers in a Pod, thus decoupling Pod deployment from managing sensitive data needed by the containerized applications within a Pod.

It is a common practice for a DevOps Team to manage the YAML manifests for various Kubernetes resources and version control them using a Git repository. Additionally, they can integrate a Git repository with a GitOps workflow to do Continuous Delivery of such resources to an EKS cluster. The challenge here is about managing the YAML manifests for Kubernetes Secrets outside the cluster. The sesitive data in a Secret is obfuscated by using merely base64 encoding. Storing such files in a Git repository is extremely insecure as it is trivial to decode the base64 encoded data.

Sealed Secrets provides a mechanism to encrypt a Secret object so that it is safe to store - even to a public repository. A SealedSecret can be decrypted only by the controller running in the Kubernetes cluster and nobody else is able to obtain the original Secret from a SealedSecret. Use SealedSecrets to encrypt YAML manifests pertaining to Kubernetes Secrets as well as be able deploy these encrypted Secrets to your EKS clusters using normal workflows.

First, test the secrets as variables and volumes with pods in lib/secrets-controller.ts

```javascript
const control = new SecretsEks(this, 'SecretsEks', {clusterMain});
control.variableSecret({clusterMain});
control.volumeSecret({clusterMain});
```

Sealed Secrets is composed of two parts: - A cluster-side controller - A client-side utility called kubeseal.

Upon startup, the controller looks for a cluster-wide private/public key pair, and generates a new 4096 bit RSA key pair if not found. The private key is persisted in a Secret object in the same namespace as that of the controller. The public key portion of this is made publicly available to anyone wanting to use SealedSecrets with this cluster.

During encryption, each value in the original Secret is symmetrically encrypted using AES-256 with a randomly-generated session key. The session key is then asymmetrically encrypted with the controller’s public key using SHA256 and the original Secret’s namespace/name as the input parameter. The output of the encryption process is a string that is constructed as follows:
length (2 bytes) of encrypted session key + encrypted session key + encrypted Secret

When a SealedSecret custom resource is deployed to the Kubernetes cluster, the controller will pick it up, unseal it using the private key and create a Secret resource. During decryption, the SealedSecret’s namespace/name is used again as the input parameter. This ensures that the SealedSecret and Secret are strictly tied to the same namespace and name.

The companion CLI tool kubeseal is used for creating a SealedSecret custom resource definition (CRD) from a Secret resource definition using the public key. kubeseal can communicate with the controller through the Kubernetes API server and retrieve the public key needed for encrypting a Secret at run-time. The public key may also be downloaded from the controller and saved locally to be used offline.

Deploy sealed secrets controller in k8s/sealed-secrets-controller/controller.yaml

Delete lib/secrets-controller.ts, kubeseal you can create yaml from binary, so let's use the secret we created earlier and add it to the CDK resource. 

```s
$ wget https://eksworkshop.com/beginner/200_secrets/secrets.files/kustomization.yaml
$ kubectl kustomize . > secret.yaml
$ kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
```
An alternative approach is to fetch the public key from the controller and use it offline to seal your Secrets

```s
$ kubeseal --fetch-cert > public-key-cert.pem
$ kubeseal --cert=public-key-cert.pem --format=yaml < secret.yaml > sealed-secret.yaml
```

Migrate sealed-secret.yaml to lib/sealed-secrets-controller.ts.

```javascript
const control = new SealedSecretsEks(this, 'SealedSecretsEks', {clusterMain});
control.variableSecret({clusterMain});
```
The code lib/sealed-secrets-controller.ts, that pertains to the SealedSecret is safe to be stored in a Git repository along with YAML manifests pertaining to other Kubernetes resources such as DaemonSets, Deployments, ConfigMaps etc. deployed in the cluster.