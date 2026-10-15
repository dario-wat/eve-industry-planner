---
name: deploy-lambda
description: >-
  Package, deploy, and invoke EVE Industry Planner Lambda functions listed in
  server/lambda.functions.json. Use when the user asks to deploy, update, upload,
  or run a Lambda on AWS, including eve-industry-planner-ping.
---

# Deploy Lambda

Deploy and invoke only when the user asks. Deploy does not imply invoke. Invoke does not imply deploy.

From the repo root. Function names and region come from `server/lambda.functions.json`. Packaging and upload already live in `npm run lambda-deploy`. Do not reimplement them.

## Deploy

```bash
npm run lambda-deploy -- eve-industry-planner-ping
```

Omit the function name only when the user asked to deploy every function in the file.

The script compiles, zips, and uploads. It updates runtime, handler, timeout, and memory. It does not pass environment variables, so `DATABASE_*` already on the function stays. Do not add `--environment` or call `update-function-configuration` yourself.

Deploy takes several minutes. Do not start a second deploy while one is running.

## Invoke

Invoke after a deploy has finished. Write the payload to `build/lambda-payload.json` (`{}` when the user did not give one). Read region from `server/lambda.functions.json`. Use forward slashes in `fileb://`.

```bash
aws --no-cli-pager lambda invoke --region us-west-2 --function-name eve-industry-planner-ping --cli-binary-format raw-in-base64-out --payload fileb://C:/Users/daki1/Documents/code/eve-industry-planner/build/lambda-payload.json build/lambda-invoke-out.json
```

Replace region, function name, and the repo path. Do not pass the payload inline. PowerShell mangles `{}`.

Report the CLI status code and the body in `build/lambda-invoke-out.json`. Omit credentials if a failure message contains them.

## Session expired

If AWS prints that the session expired or tells you to run `aws login`, stop. Ask the user to run `aws login`. Do not run it yourself. Do not retry until they say they have signed in.

## Two databases

The function writes `lambda_job_runs` using the `DATABASE_*` values already on the function. The Jobs page and the query-mysql skill read the local database in repo-root `.env`. A successful invoke does not show up on the Jobs page.

Do not read the function environment to query or create that remote database. Do not print `DATABASE_*` or `get-function-configuration` environment output.
