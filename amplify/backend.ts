// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
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
const USERS_TABLE_NAME = 'chonky-users-dev';

const postConfirmationLambda = backend.postConfirmation.resources.lambda;
const stack = Stack.of(postConfirmationLambda);

postConfirmationLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:TransactWriteItems'],
    resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${USERS_TABLE_NAME}`],
  })
);
