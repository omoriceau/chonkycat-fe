// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { postConfirmation } from './auth/post-confirmation/resource';

const backend = defineBackend({
  auth,
  storage,
  postConfirmation,
});

// The Users table lives in the chonky-cat-be SAM stack, not here — grant
// the trigger just enough access to write the profile + email-lock item
// (see post-confirmation/handler.ts). Table name must match samconfig.toml's
// UsersTableName override in that repo; region/account come from this
// stack, so this only resolves correctly if both stacks deploy to the same
// region (us-east-1).
// ENV is read at CDK synth time from Amplify Console's backend build
// environment variables (Hosting > Environment variables) — defaults to
// 'production' so nothing breaks if it's unset.
const ENV = process.env.ENV ?? 'production';
const USERS_TABLE_NAME = `chonky-users-${ENV}`;

const postConfirmationLambda = backend.postConfirmation.resources.lambda;
const stack = Stack.of(postConfirmationLambda);

// TransactWriteItems alone isn't enough — IAM evaluates each operation
// inside a transaction as if it were called directly, so the Put calls in
// handler.ts also need PutItem granted explicitly.
postConfirmationLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:TransactWriteItems', 'dynamodb:PutItem'],
    resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${USERS_TABLE_NAME}`],
  })
);

// handler.ts runs as the deployed Lambda at request time, not during this
// CDK synth, so it can't read process.env.ENV above — pass the resolved
// table name through as a real Lambda environment variable instead of
// duplicating the ENV lookup/hardcoded string in a second place.
(postConfirmationLambda as LambdaFunction).addEnvironment('USERS_TABLE_NAME', USERS_TABLE_NAME);
