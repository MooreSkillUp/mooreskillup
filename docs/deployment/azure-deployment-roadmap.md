# Azure Deployment Roadmap

## Purpose

This roadmap is the step-by-step path from local development to a staged and then production-ready Azure deployment for MooreSkillUp.

It is written so you can follow it in order without guessing what comes next.

## Deployment target

The current deployment plan is:

- Azure Container Registry for images
- Azure Container Apps for web and API runtime
- Azure Database for PostgreSQL for relational data
- Azure Cache for Redis for sessions, rate limiting, and caching
- Azure Blob Storage for media and static artifacts
- Azure Key Vault for secrets
- Azure Monitor and Application Insights for observability
- GitHub Actions for CI/CD

## Does local development still work?

Yes.

Nothing in this roadmap replaces local development. You can still run the app locally with the existing dev workflow, and the Azure setup is only the production/staging delivery path.

Typical local flow:

```bash
npm install
npm run dev
```

If you want the containerized local stack, use the repo’s Docker Compose workflow instead.

## Phase 1: Decide the release model

Before you deploy, lock the rollout model:

1. **Staging first**
   - every change lands in staging before production
   - staging is where you validate infrastructure, auth, and smoke tests
2. **Production second**
   - only promote a known good build after staging passes
   - production uses the same IaC modules, with separate state and secrets
3. **Immutable images**
   - image tags should match a commit SHA or release tag
   - do not rebuild the same tag for different code

## Phase 2: Prepare the repository

Make sure the repo is ready before any Azure work begins.

### Required code and docs

- Dockerfiles for frontend and backend
- Terraform scaffold under `infrastructure/terraform/`
- GitHub Actions workflows for CI, Terraform plan, staging deploy, and production deploy
- Deployment docs in `docs/deployment/`, `docs/ci-cd/`, `docs/terraform/`, and `docs/security/`

### Validate locally first

Run the same checks the pipeline will run:

```bash
npm ci
npm run lint
npm run build
npx tsc --noEmit
python backend/manage.py check
```

If any of these fail locally, fix them before touching Azure.

## Phase 3: Create the Azure foundation

Provision the cloud foundation once per environment.

### 3.1 Create Azure subscriptions or resource groups

Use separate resource groups at minimum:

- `mooreskillup-staging-rg`
- `mooreskillup-prod-rg`

If you have multiple Azure subscriptions, staging and production should be isolated there as well.

### 3.2 Create the shared Azure resources

For each environment, create:

- Azure Container Registry
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Storage Account and containers
- Azure Key Vault
- Azure Container Apps Environment
- Log Analytics workspace
- Application Insights

### 3.3 Set network and identity rules

Recommended baseline:

- private access for database and secret stores where possible
- managed identity for app-to-Azure access
- least-privilege role assignments
- no public exposure for admin-only services unless required during bootstrap

### 3.4 Bootstrapping rule

The first deploy can use a simpler bootstrap path if needed, but it must be temporary.

Recommended bootstrap order:

1. create the foundation
2. allow temporary registry access if required
3. deploy staging
4. switch to managed identity and tighter access
5. repeat for production

## Phase 4: Configure Terraform

Terraform should be the source of truth for infrastructure.

### 4.1 Backend state

Set up remote Terraform state before any real deployment.

Use:

- one backend storage account
- one container for state
- one key per environment

Example state split:

- `staging.tfstate`
- `prod.tfstate`

### 4.2 Environment structure

Keep separate values for:

- dev
- staging
- production

Never reuse the same state file for more than one environment.

### 4.3 Apply order

The Terraform flow should be:

1. initialize backend
2. validate and format
3. plan
4. apply foundation
5. build and push images
6. apply application layer with image tags

### 4.4 Variables to define

At minimum, define values for:

- Azure subscription and tenant
- resource group name
- region
- container registry name
- database name and credentials
- Redis settings
- storage settings
- public app URL
- API URL
- image tags

## Phase 5: Prepare secrets and configuration

Do not hardcode secrets into code or Terraform state.

### 5.1 GitHub Secrets

Add the following secrets to GitHub:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `TF_STATE_RESOURCE_GROUP`
- `TF_STATE_STORAGE_ACCOUNT`
- `TF_STATE_CONTAINER`
- `TF_STATE_KEY_STAGING`
- `TF_STATE_KEY_PROD`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `DATABASE_URL` or split database values
- `REDIS_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `FORMSPREE_ENDPOINT` if contact forms are enabled

### 5.2 Azure Key Vault

Store runtime secrets in Key Vault, such as:

- Django secret key
- database password
- Redis password
- API tokens
- email provider keys

### 5.3 Configuration rules

- public frontend environment variables can be injected at build time
- private backend secrets should come from Key Vault or environment settings
- do not expose secret values in pipeline logs

## Phase 6: Set up CI/CD

GitHub Actions should do the build, test, and deploy work.

### 6.1 CI workflow

Run on every pull request and push:

- install dependencies
- lint
- typecheck
- build frontend
- validate backend
- terraform fmt
- terraform validate
- security scanning if available

### 6.2 Staging deployment workflow

Staging should run automatically after main branch merges or approved release events.

Staging flow:

1. check out code
2. install dependencies
3. run tests and build checks
4. run Terraform plan
5. apply the Azure foundation
6. build frontend and backend images
7. push images to ACR
8. apply the app layer
9. run smoke tests

### 6.3 Production deployment workflow

Production should be manual or approval-gated.

Production flow:

1. choose a known good tag
2. verify staging is healthy
3. approve release
4. apply foundation if needed
5. deploy the same immutable images
6. run post-deploy smoke tests
7. record release notes

## Phase 7: Build and push images

For each release:

1. build the backend image
2. build the frontend image
3. tag both images with the commit SHA
4. push both images to Azure Container Registry
5. promote the exact same tags to staging or production

Recommended image tags:

- `sha-<commit>`
- `staging-latest`
- `prod-latest` only if your release process is strict and controlled

Avoid using floating tags alone for production traceability.

## Phase 8: Deploy staging

Use staging as the first real proving ground.

### 8.1 Deploy the foundation

Confirm that staging has:

- registry
- database
- Redis
- storage
- Key Vault
- container app environment
- logs and monitoring

### 8.2 Deploy the application layer

Confirm that:

- frontend URL resolves
- backend API URL resolves
- environment variables are injected correctly
- database connections succeed
- Redis connections succeed

### 8.3 Run staging smoke tests

Minimum staging smoke tests:

- landing page loads
- login page loads
- registration page loads
- protected route redirects unauthenticated users
- dashboard loads for authenticated users
- logout clears the session
- API health endpoint responds

### 8.4 Fix staging issues before moving on

If staging fails, stop and fix:

- build failures
- secrets issues
- database migrations
- cross-origin settings
- auth redirects
- missing static assets
- broken API wiring

## Phase 9: Promote to production

Production should be a promotion, not a reinvention.

### 9.1 Pre-production checklist

Make sure:

- staging passed
- the release tag is known
- backup strategy is active
- rollback image is retained
- production secrets are set
- monitoring alerts are enabled

### 9.2 Production rollout steps

1. approve the release
2. apply the production foundation if needed
3. deploy the exact same image versions used in staging
4. run smoke tests against the production URL
5. confirm logs, health checks, and metrics
6. notify the team that the release is live

### 9.3 Cutover checklist

- DNS points to the correct live endpoint
- SSL/TLS is active
- app URL and API URL match the environment values
- email links and redirects use the production domain
- admin access works

## Phase 10: Operational readiness

Once the app is live, keep the system healthy.

### Monitoring

Track:

- CPU and memory
- request latency
- error rates
- database connections
- Redis health
- storage errors
- login failures

### Backups

Have backups for:

- PostgreSQL
- critical blob data
- Terraform state

### Logging

Log enough to debug:

- auth failures
- API errors
- migration problems
- deploy failures
- permission errors

### Alerts

Alert on:

- app health failure
- database down
- high error rate
- failed deploy
- low disk or storage thresholds

## Phase 11: Rollback plan

Every release needs an escape hatch.

Rollback order:

1. redeploy the previous working image tag
2. restore previous environment variables if needed
3. revert the Terraform change if the infrastructure changed
4. re-run smoke tests
5. confirm users are back on the last known good version

## Phase 12: Keep local and cloud workflows aligned

The cloud path should not drift away from the local path.

Keep these aligned:

- `.env.local` values
- staging environment variables
- production environment variables
- auth redirect URLs
- API base URLs
- CORS settings

That way, a bug found locally can usually be reproduced in staging with minimal effort.

## Recommended implementation order

If you are doing this step by step, follow this order:

1. verify local build and tests
2. finalize Docker images
3. finalize Terraform state and environment structure
4. create Azure foundation
5. connect GitHub Actions to Azure
6. deploy staging
7. smoke test and fix staging
8. enable production approval
9. deploy production
10. add monitoring, alerts, and backups

## Final production checklist

- local build passes
- CI passes
- staging deploy passes
- production deploy approved
- secrets live in Key Vault or GitHub secrets
- database migrations run cleanly
- smoke tests pass
- monitoring is on
- backups are enabled
- rollback plan is written and tested

