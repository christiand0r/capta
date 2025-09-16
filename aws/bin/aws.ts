#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { HonoApiStack } from "../lib/hono-api-stack";

const app = new cdk.App();

new HonoApiStack(app, "HonoApiStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
