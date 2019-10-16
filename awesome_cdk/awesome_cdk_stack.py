from aws_cdk import core

from .vpc_construct import VpcConstruct
from .asg_construct import AsgConstruct

class AwesomeCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # The code that defines your stack goes here
        vpc = VpcConstruct(self, "MyVPCConstruct")
        asg = AsgConstruct(self, "MyASGConstruct", vpc._vpc)