#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { HonoApiStack } from "../lib/hono-api-stack";

const app = new cdk.App();

new HonoApiStack(app, "HonoApiStack", {});
