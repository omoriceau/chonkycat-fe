#!/usr/bin/env node
// scripts/resolve-api-url.mjs
//
// Resolves the backend API base URL from live AWS state and writes it to
// .env.local (gitignored — overrides the static default in .env) as
// VITE_API_BASE_URL. Runs automatically before `npm run dev` / `npm run
// build` via the predev/prebuild hooks in package.json.
//
// Resolution order:
//   1. If the API Gateway custom domain (api.chonkycat.ca) has an active
//      base path mapping, use https://<custom domain>[/<basePath>].
//   2. Otherwise, derive the default execute-api URL from the backend's
//      REST API + deployed stage.
//   3. If AWS can't be reached (no credentials, no CLI, offline), do
//      nothing — .env.local is left as-is and the static
//      VITE_API_BASE_URL in .env still applies.
//
// Requires the AWS CLI, configured with credentials that can read API
// Gateway (apigateway:GET*) in the backend's account/region. Never fails
// the build — worst case it just doesn't update .env.local.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REGION = process.env.AWS_REGION || 'us-east-1';
const CUSTOM_DOMAIN = process.env.API_CUSTOM_DOMAIN || 'api.chonkycat.ca';
// Matches the REST API's deployed Name in API Gateway, which mirrors
// stack_name in chonky-cat-be/samconfig.toml.
const STACK_NAME = process.env.BACKEND_API_NAME || 'chonkychonk-products-dev';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENV_LOCAL_PATH = path.join(ROOT, '.env.local');

function aws(args) {
  return execFileSync('aws', [...args, '--region', REGION, '--output', 'json'], {
    encoding: 'utf8',
  });
}

/** Returns the live URL if api.chonkycat.ca has a base path mapping, null if it simply isn't mapped yet, throws on real failures (bad creds, CLI missing, etc). */
function resolveViaCustomDomain() {
  let out;
  try {
    out = aws(['apigateway', 'get-base-path-mappings', '--domain-name', CUSTOM_DOMAIN]);
  } catch (err) {
    const stderr = String(err.stderr || err.message);
    if (stderr.includes('NotFoundException')) {
      return null; // domain isn't registered in API Gateway at all
    }
    throw err;
  }

  const mappings = JSON.parse(out).items || [];
  if (mappings.length === 0) return null; // domain exists but nothing mapped to it yet

  const basePath = mappings[0].basePath;
  const suffix = basePath && basePath !== '(none)' ? `/${basePath}` : '';
  return `https://${CUSTOM_DOMAIN}${suffix}`;
}

function resolveViaDefaultApiGateway() {
  const apis = JSON.parse(aws(['apigateway', 'get-rest-apis'])).items || [];
  const api = apis.find((a) => a.name === STACK_NAME);
  if (!api) {
    throw new Error(`No REST API named '${STACK_NAME}' found in ${REGION}`);
  }

  const stages = JSON.parse(aws(['apigateway', 'get-stages', '--rest-api-id', api.id])).item || [];
  if (stages.length === 0) {
    throw new Error(`REST API '${api.id}' has no deployed stages`);
  }
  const stage = stages.find((s) => s.stageName === 'Prod') || stages[0];

  return `https://${api.id}.execute-api.${REGION}.amazonaws.com/${stage.stageName}`;
}

function main() {
  let apiUrl = null;
  let source = '';

  try {
    apiUrl = resolveViaCustomDomain();
    source = 'custom domain mapping';
  } catch (err) {
    console.warn(`[resolve-api-url] Could not check custom domain mapping: ${err.message}`);
  }

  if (!apiUrl) {
    try {
      apiUrl = resolveViaDefaultApiGateway();
      source = 'default API Gateway URL (no custom domain mapping found)';
    } catch (err) {
      console.warn(`[resolve-api-url] Could not resolve default API Gateway URL: ${err.message}`);
    }
  }

  if (!apiUrl) {
    console.warn('[resolve-api-url] Could not reach AWS — leaving VITE_API_BASE_URL as whatever .env/.env.local already has.');
    return;
  }

  writeFileSync(ENV_LOCAL_PATH, `VITE_API_BASE_URL=${apiUrl}\n`);
  console.log(`[resolve-api-url] Using ${source}: ${apiUrl}`);
}

main();
