import { ec2 } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

export const tags = {
    ChallengeName: "InfrastructureOnTheCloud",
    Participant: "Salvador Montiel",
    Provisioner: "Pulumi"
};
export const pgDb = "infra-challenge";
export const pgUser = "postgres";
export const pgPassword = config.require("pgPassword");
export const publicKey = config.require("publicKey");
export const keyName = "ssh-key";

const keyPair = new ec2.KeyPair(keyName, {
    keyName: keyName,
    publicKey: publicKey,
    tags: tags
});

export const ami = ec2.getAmiOutput({
    filters: [{
        name: "name",
        values: ["amzn-ami-hvm-*"],
    }],
    owners: ["137112412989"], // This owner ID is Amazon
    mostRecent: true,
    tags: tags
});
