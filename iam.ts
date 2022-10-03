import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { tags } from "./common"

const ec2AppRole = new aws.iam.Role("ec2-app-role", {
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

const appLogGroup = new aws.cloudwatch.LogGroup("app-log-group", {
    name: "/carrier/app/log",
    retentionInDays: 1,
    tags: tags
});

appLogGroup.arn.apply(appArn => {
    const appLogGroupPolicy = new aws.iam.Policy("app-log-group-policy", {
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
                    appArn + ":*"
                ]
            }]
        }),
        tags: tags
    });

    const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("ec2-app-role-policy-attachment", {
        role: ec2AppRole,
        policyArn: appLogGroupPolicy.arn
    });
});

const ec2DbRole = new aws.iam.Role("ec2-db-role", {
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

const dbLogGroup = new aws.cloudwatch.LogGroup("db-log-group", {
    name: "/carrier/db/log",
    retentionInDays: 1,
    tags: tags
});

dbLogGroup.arn.apply(dbArn => {
    const dbLogGroupPolicy = new aws.iam.Policy("db-log-group-policy", {
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
                    dbArn + ":*"
                ]
            }]
        }),
        tags: tags
    });

    const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("ec2-db-role-policy-attachment", {
        role: ec2DbRole,
        policyArn: dbLogGroupPolicy.arn
    });
});

export const ec2AppInstanceProfile = new aws.iam.InstanceProfile("ec2-app-instance-profile", { role: ec2AppRole.name });
export const ec2DbInstanceProfile = new aws.iam.InstanceProfile("ec2-db-instance-profile", { role: ec2DbRole.name });
