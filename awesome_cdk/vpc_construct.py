from aws_cdk import (
    aws_ec2 as ec2,
    core,
)

class VpcConstruct(core.Construct):

    def __init__(self, scope: core.Construct, id: str) -> None:
        super().__init__(scope, id)
        self._vpc = ec2.Vpc(self, 'AwesomeVPC', cidr='10.0.0.0/21', max_azs=3, 
                    subnet_configuration=[ec2.SubnetConfiguration(name='PrivateName', subnet_type=ec2.SubnetType.PRIVATE, cidr_mask=24), ec2.SubnetConfiguration(name='PublicName', subnet_type=ec2.SubnetType.PUBLIC, cidr_mask=24)])
    @property
    def vpc(self):
        return tuple(self._vpc)