import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { ami, keyName, pgDb, pgPassword, pgUser, tags } from "./common"
import { ec2DbInstanceProfile } from "./iam";

const ingressGroup = new aws.ec2.SecurityGroup("db-server-sg", {
    ingress: [
        {
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
            cidrBlocks: ["0.0.0.0/0"]
        },
        {
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
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

const dbSchema = `
CREATE TABLE message (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(25),
  destination VARCHAR(25),
  message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)`;

const userData = `#! /bin/sh
yum update -y
yum install -y docker awslogs
service docker start
service awslogs start
usermod -aG docker ec2-user
docker run --log-driver=awslogs --log-opt awslogs-region=us-east-1 --log-opt awslogs-group=/carrier/db/log --name postgresql -e POSTGRES_DB=${pgDb} -e POSTGRES_USER=${pgUser} -e POSTGRES_PASSWORD=${pgPassword} -p 5432:5432 -v /data:/var/lib/postgresql/data -d postgres
sleep 15s
echo '${dbSchema}' | docker exec -i postgresql psql -h localhost -U ${pgUser} -d ${pgDb}
`;

export const dbServer = new aws.ec2.Instance("db-server", {
    instanceType: "t2.micro",
    ami: ami.id,
    userData: userData,
    userDataReplaceOnChange: true,
    vpcSecurityGroupIds: [ingressGroup.id],
    keyName: keyName,
    iamInstanceProfile: ec2DbInstanceProfile,
    tags: tags
});
