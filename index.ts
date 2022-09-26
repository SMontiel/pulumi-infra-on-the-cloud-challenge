import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
let config = new pulumi.Config();

const tags = {
    ChallengeName: "InfrastructureOnTheCloud",
    Participant: "Salvador Montiel",
    Provisioner: "Pulumi"
};

const ingressGroup = new aws.ec2.SecurityGroup("app-server-secgroup", {
    ingress: [
        {
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
            cidrBlocks: ["0.0.0.0/0"]
        },
        {
            protocol: "tcp",
            fromPort: 8080,
            toPort: 8080,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ],
    tags: tags
});

const ami = aws.ec2.getAmiOutput({
    filters: [{
        name: "name",
        values: ["amzn-ami-hvm-*"],
    }],
    owners: ["137112412989"], // This owner ID is Amazon
    mostRecent: true,
    tags: tags
});

const userData = `#! /bin/sh
#yum update -y
curl -o /home/ec2-user/carrier https://raw.githubusercontent.com/SMontiel/ec2-instance-terraform/main/carrier_linux
chmod +x /home/ec2-user/carrier
/home/ec2-user/carrier &`

let publicKey = config.require("publicKey");
const keyName = "ssh-key";
const keyPair = new aws.ec2.KeyPair(keyName, {
    keyName: keyName,
    publicKey: publicKey,
    tags: tags
});

const appServer = new aws.ec2.Instance("app-server", {
    instanceType: "t2.micro",
    ami: ami.id,
    userData: userData,
    vpcSecurityGroupIds: [ingressGroup.id],
    keyName: keyName,
    tags: tags
});

export const publicIp = appServer.publicIp;
export const publicHostName = appServer.publicDns;
export const publicURL = appServer.publicDns.apply(dns => `http://${dns}:8080`)
