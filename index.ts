import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

let config = new pulumi.Config();
const pgDb = "infra-challenge";
const pgUser = "postgres";
const pgPassword = config.require("pgPassword");
const publicKey = config.require("publicKey");
const keyName = "ssh-key";

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

const dbSchema = `
CREATE TABLE message (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(25),
  destination VARCHAR(25),
  message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)`;
const configJson = `{
  "host": "localhost",
  "port": 5432,
  "database": "${pgDb}",
  "username": "${pgUser}",
  "password": "${pgPassword}",
  "ssl": "disable"
}`;
const userData = `#! /bin/sh
yum update -y
yum install -y docker
service docker start
usermod -aG docker ec2-user
echo '${configJson}' > /config.json
docker run --name postgresql -e POSTGRES_DB=${pgDb} -e POSTGRES_USER=${pgUser} -e POSTGRES_PASSWORD=${pgPassword} -p 5432:5432 -v /data:/var/lib/postgresql/data -d postgres
curl -o /home/ec2-user/carrier https://raw.githubusercontent.com/SMontiel/ec2-instance-terraform/main/carrier_linux
sleep 15s
echo '${dbSchema}' | docker exec -i postgresql psql -h localhost -U ${pgUser} -d ${pgDb}
chmod +x /home/ec2-user/carrier
/home/ec2-user/carrier &`;

const keyPair = new aws.ec2.KeyPair(keyName, {
    keyName: keyName,
    publicKey: publicKey,
    tags: tags
});

const appServer = new aws.ec2.Instance("app-server", {
    instanceType: "t2.micro",
    ami: ami.id,
    userData: userData,
    userDataReplaceOnChange: true,
    vpcSecurityGroupIds: [ingressGroup.id],
    keyName: keyName,
    tags: tags
});

export const publicIp = appServer.publicIp;
export const publicHostName = appServer.publicDns;
export const publicURL = appServer.publicDns.apply(dns => `http://${dns}:8080`);
