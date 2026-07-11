#!/usr/bin/env node
// scripts/push-images.mjs
//
// Uploads ./img (see scripts/init-images.mjs) to a plain S3 bucket named
// chonky-images-<env> (default env "dev", override with ENVIRONMENT),
// creating the bucket if it doesn't exist yet.
//
// Deliberately bypasses Amplify entirely — this bucket is independent of
// the Amplify-managed catFoodProductImages bucket (amplify/storage), so
// pushing images no longer depends on the Amplify sandbox being deployed.
// It's a plain public-read bucket (scoped to the img/* prefix only) via a
// bucket policy, not Cognito-signed access, since anonymous storefront
// visitors need to load these with a plain <img src>.
//
// Requires: AWS CLI credentials with s3:CreateBucket / s3:PutBucketPolicy
// / s3:PutObject (broad, since it can provision a new bucket — same
// credentials used elsewhere in this repo for aws cli calls).

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMG_DIR = path.join(ROOT, 'img');

const REGION = process.env.AWS_REGION || 'us-east-1';
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';
const BUCKET_NAME = process.env.IMAGES_BUCKET_NAME || `chonky-images-${ENVIRONMENT}`;

function aws(args, opts = {}) {
  return execFileSync('aws', args, { encoding: 'utf8', ...opts });
}

/** true if it exists and we can access it, false if it doesn't exist yet. Throws for anything else (e.g. name owned by another account). */
function bucketExists(bucket) {
  try {
    aws(['s3api', 'head-bucket', '--bucket', bucket, '--region', REGION], { stdio: 'pipe' });
    return true;
  } catch (err) {
    const stderr = String(err.stderr || err.message);
    if (stderr.includes('404') || stderr.includes('Not Found')) {
      return false;
    }
    if (stderr.includes('403') || stderr.includes('Forbidden')) {
      throw new Error(
        `Bucket '${bucket}' exists but isn't accessible with these credentials — ` +
        `S3 bucket names are globally unique, so this name may belong to a different AWS account. ` +
        `Set IMAGES_BUCKET_NAME to something else if so.`
      );
    }
    throw err;
  }
}

function createBucket(bucket) {
  console.log(`[push-images] Bucket '${bucket}' doesn't exist — creating it in ${REGION}`);

  const createArgs = ['s3api', 'create-bucket', '--bucket', bucket, '--region', REGION];
  // us-east-1 is the one region where you must NOT pass a LocationConstraint.
  if (REGION !== 'us-east-1') {
    createArgs.push('--create-bucket-configuration', `LocationConstraint=${REGION}`);
  }
  aws(createArgs);

  // Keep ACLs locked down (BlockPublicAcls/IgnorePublicAcls stay true) —
  // public read is granted via bucket policy below, scoped to img/* only.
  aws([
    's3api', 'put-public-access-block',
    '--bucket', bucket,
    '--region', REGION,
    '--public-access-block-configuration',
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false',
  ]);

  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Sid: 'PublicReadProductImages',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${bucket}/img/*`,
    }],
  });
  aws(['s3api', 'put-bucket-policy', '--bucket', bucket, '--region', REGION, '--policy', policy]);

  console.log(`[push-images] Created '${bucket}' with public read on img/*`);
}

function main() {
  if (!existsSync(IMG_DIR) || readdirSync(IMG_DIR).length === 0) {
    throw new Error('./img is empty or missing — run `npm run init-images` first.');
  }

  if (!bucketExists(BUCKET_NAME)) {
    createBucket(BUCKET_NAME);
  }

  const dest = `s3://${BUCKET_NAME}/img/`;
  console.log(`[push-images] Syncing ./img -> ${dest} (region ${REGION})`);
  // Deliberately no --delete: once real product photos start replacing
  // placeholders under img/<sku>.jpg, a sync-with-delete here would wipe
  // out anything in the bucket that isn't in this run's local ./img,
  // which is only ever the placeholder set. Stale placeholder objects for
  // removed SKUs are a much smaller problem than that.
  execFileSync('aws', ['s3', 'sync', IMG_DIR, dest, '--region', REGION], { stdio: 'inherit' });
  console.log(`[push-images] Done. Public URL prefix: https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/img/`);
}

try {
  main();
} catch (err) {
  console.error(`[push-images] Failed: ${err.message}`);
  process.exit(1);
}
