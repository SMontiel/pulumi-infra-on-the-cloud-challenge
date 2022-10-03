import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { ami, keyName, pgDb, pgPassword, pgUser, tags } from "./common"
import { dbServer } from "./database";
import { ec2AppInstanceProfile } from "./iam";

const ingressGroup = new aws.ec2.SecurityGroup("app-server-sg", {
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

export const appServer = dbServer.publicDns.apply(dbHost => {
    const configJson = `{
        "host": "${dbHost}",
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
        yum install -y awslogs
        echo '${awsLogsConf}' > /etc/awslogs/awslogs.conf
        service awslogs start
        echo '${configJson}' > /config.json
        curl -o /home/ec2-user/carrier https://raw.githubusercontent.com/SMontiel/ec2-instance-terraform/main/carrier_linux
        sleep 15s
        chmod +x /home/ec2-user/carrier
        /home/ec2-user/carrier &`;

    return new aws.ec2.Instance("app-server", {
        instanceType: "t2.micro",
        ami: ami.id,
        userData: userData,
        userDataReplaceOnChange: true,
        vpcSecurityGroupIds: [ingressGroup.id],
        keyName: keyName,
        iamInstanceProfile: ec2AppInstanceProfile,
        tags: tags
    });
});
