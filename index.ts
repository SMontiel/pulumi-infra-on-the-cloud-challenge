import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { tags } from "./common"
import { ec2InstanceProfile } from "./iam";

let config = new pulumi.Config();
const pgDb = "infra-challenge";
const pgUser = "postgres";
const pgPassword = config.require("pgPassword");
const publicKey = config.require("publicKey");
const keyName = "ssh-key";

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
const awsLogsConf = `
[general]
state_file = /var/lib/awslogs/agent-state
[/carrier/app/log]
datetime_format = %b %d %H:%M:%S
file = /carrier.log
buffer_duration = 5000
log_stream_name = {instance_id}
initial_position = start_of_file
log_group_name = /carrier/app/log`;
const userData = `#! /bin/sh
yum update -y
yum install -y docker awslogs
service docker start
echo '${awsLogsConf}' > /etc/awslogs/awslogs.conf
service awslogs start
usermod -aG docker ec2-user
echo '${configJson}' > /config.json
docker run --log-driver=awslogs --log-opt awslogs-region=us-east-1 --log-opt awslogs-group=/carrier/postgres/log --name postgresql -e POSTGRES_DB=${pgDb} -e POSTGRES_USER=${pgUser} -e POSTGRES_PASSWORD=${pgPassword} -p 5432:5432 -v /data:/var/lib/postgresql/data -d postgres
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
    iamInstanceProfile: ec2InstanceProfile,
    tags: tags
});

export const publicIp = appServer.publicIp;
export const publicHostName = appServer.publicDns;
export const publicURL = appServer.publicDns.apply(dns => `http://${dns}:8080`);
