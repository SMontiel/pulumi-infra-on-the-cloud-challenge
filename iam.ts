import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { tags } from "./common"

const ec2Role = new aws.iam.Role("ec2-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Principal: {
                Service: "ec2.amazonaws.com"
            },
            Effect: "Allow",
            Sid: ""
        }]
    }),
    tags: tags
});

const carrierLogGroup = new aws.cloudwatch.LogGroup("carrier-log-group", {
    name: "/carrier/app/log",
    retentionInDays: 1,
    tags: tags
});

const postgresLogGroup = new aws.cloudwatch.LogGroup("postgres-log-group", {
    name: "/carrier/postgres/log",
    retentionInDays: 1,
    tags: tags
});
pulumi.all([carrierLogGroup.arn, postgresLogGroup.arn]).apply(([carrierArn, postgresArn]) => {
    const logGroupPolicy = new aws.iam.Policy("log-group-policy", {
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "logs:DescribeLogStreams"
                ],
                Effect: "Allow",
                Resource: [
                    carrierArn + ":*",
                    postgresArn + ":*"
                ]
            }]
        }),
        tags: tags
    });

    const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("ec2-role-policy-attachment", {
        role: ec2Role,
        policyArn: logGroupPolicy.arn
    });
});

export const ec2InstanceProfile = new aws.iam.InstanceProfile("ec2InstanceProfile", { role: ec2Role.name });
