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

## Create Dash Board

After the stack is deployed...

* Use the outputs to access the tokens and update your kubeconfig
* With kubectl apply k8s/dashboard
* Create proxy: kubectl proxy --port=8080 --disable-filter=true
* See page dashboard: http://127.0.0.1:8080/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#/login

