import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { appServer } from "./carrier";
import { dbServer } from "./database";

export const publicIp = appServer.publicIp;
export const publicHostName = appServer.publicDns;
export const publicURL = appServer.publicDns.apply(dns => `http://${dns}:8080`);

export const dbPublicIp = dbServer.publicIp;
export const dbPublicHostName = dbServer.publicDns;
