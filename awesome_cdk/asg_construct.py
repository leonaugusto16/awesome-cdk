from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    core,
)

class AsgConstruct(core.Construct):
    def __init__(self, scope: core.Construct, id: str, vpc) -> None:
        super().__init__(scope, id)
        self._asg = autoscaling.AutoScalingGroup(
            self, "AwesomeASG",
            instance_type=ec2.InstanceType("t2.micro"),
            machine_image=ecs.EcsOptimizedAmi(),
            associate_public_ip_address=True,
            update_type=autoscaling.UpdateType.ROLLING_UPDATE,
            desired_capacity=2,
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_name='PublicName')
        )
    @property
    def asg(self):
        return tuple(self._asg)

        