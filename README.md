# Chonky Cat

Frontend for Chonky Cat, a React + Vite storefront backed by AWS Amplify
(Cognito, DynamoDB) and Stripe for checkout.

## Amplify Environment Variables

This app deploys via Amplify Hosting (`amplify.yml`), which watches the
connected GitHub branch directly — there's no separate GitHub Actions
deploy workflow. Set these in Amplify Console under **Hosting >
Environment variables**:

| Variable                | Used by                                             | Notes                                                                                                                     |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_PK`              | `amplify.yml` (frontend build)                      | Written into `.env` as `VITE_STRIPE_PUBLISHABLE_KEY` before `npm run build` (see `src/pages/Checkout.jsx`).               |
| `VITE_API_BASE_URL`      | `src/config.js` (frontend build)                    | Read directly by Vite — no `amplify.yml` mapping needed. Falls back to `https://api.chonkycat.ca` if unset.               |
| `VITE_IMAGES_BASE_URL`   | `src/config.js` (frontend build)                    | Read directly by Vite. Falls back to `https://img.chonkycat.ca` if unset.                                                  |
| `ENV`                    | `amplify/backend.ts` (backend build / CDK synth)    | Selects the DynamoDB users table (`chonky-users-${ENV}`) the post-confirmation Lambda writes to. Defaults to `production`. |

`ENV` only needs to be set on the *backend* build phase (it's read by
`amplify/backend.ts` during `npx ampx pipeline-deploy`, not by Vite) — it
isn't a `VITE_`-prefixed variable and never reaches the browser bundle.

## Local Development

Install dependencies, then run:

```bash
npm install
npm run dev
```

This opens the app at [http://localhost:5000](http://localhost:5000)
(configured in `vite.config.js`). A `predev` hook runs
`scripts/resolve-api-url.mjs`, which tries to resolve the live backend API
URL from AWS and write it to `.env.local`; if AWS credentials/CLI aren't
available it silently falls back to the static `VITE_API_BASE_URL` in
`.env`.

## Available Scripts

### `npm run dev`

Runs the app in development mode with Vite's dev server and HMR.

### `npm test`

Runs the test suite once with [Vitest](https://vitest.dev/).

### `npm run build`

Builds the app for production into the `dist` folder (via `vite build`).
Runs `resolve-api-url` first (see above).

### `npm run preview`

Serves the production build from `dist` locally, for a final sanity check
before deploying.

### `npm run init-images` / `npm run push-images`

Utility scripts (`scripts/init-images.mjs`, `scripts/push-images.mjs`) for
seeding/uploading product images used by the store.

## Code Quality

SonarQube analysis is configured via `sonar-project.properties` and runs
in CI (`.github/workflows/sonarqube.yml`). Dependency/image scanning runs
via Trivy (`.github/workflows/trivy.yml`).
