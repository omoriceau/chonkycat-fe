// amplify/auth/post-confirmation/handler.ts
//
// Runs right after a shopper confirms their email in the Amplify-managed
// customer pool (see ../resource.ts). Writes the matching profile row into
// the SAME DynamoDB users table chonky-cat-be's Users Lambda uses, keyed by
// `sub` (mirrors lambdas/users/db.py's user_id = Cognito sub convention),
// plus the "EMAIL#<email>" lock item that Lambda's email-uniqueness scheme
// relies on — so self-service signups end up structurally identical to
// accounts created via POST /users, and both stay covered by the same
// uniqueness guarantee.
import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';

// Set on this Lambda by backend.ts (derived from ENV, which defaults to
// 'production' and can be overridden via Amplify Console env vars) — no
// longer duplicated as a separate hardcoded string here.
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;
const EMAIL_LOCK_PREFIX = 'EMAIL#';

const client = new DynamoDBClient();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { sub, email } = event.request.userAttributes;
  if (!email) {
    // Shouldn't happen — email is the pool's only login method — but don't
    // silently write a profile row with no email if it somehow does.
    return event;
  }

  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  await client.send(new TransactWriteItemsCommand({
    TransactItems: [
      {
        Put: {
          TableName: USERS_TABLE_NAME,
          Item: {
            user_id:    { S: sub },
            email:      { S: normalizedEmail },
            role:       { S: 'customer' },
            status:     { S: 'active' },
            created_at: { S: now },
            updated_at: { S: now },
          },
          ConditionExpression: 'attribute_not_exists(user_id)',
        },
      },
      {
        Put: {
          TableName: USERS_TABLE_NAME,
          Item: {
            user_id:        { S: `${EMAIL_LOCK_PREFIX}${normalizedEmail}` },
            linked_user_id: { S: sub },
          },
          ConditionExpression: 'attribute_not_exists(user_id)',
        },
      },
    ],
  }));

  return event;
};
