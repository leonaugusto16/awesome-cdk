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