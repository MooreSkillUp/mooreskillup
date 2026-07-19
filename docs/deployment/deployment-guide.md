# Deployment Guide

## Goal

Deploy the current project in a way that is safe now and extensible later.

## Recommended baseline

- Frontend: containerized Next.js build
- Backend: Django + Gunicorn container
- Database: PostgreSQL
- Cache: Redis
- Storage: Blob/object storage
- Secrets: Key Vault or environment manager

## Current repo shape

- `docker-compose.yml` — local development stack
- `docker-compose.prod.yml` — production-style self-hosted stack
- `Dockerfile` — backend container
- `Dockerfile.frontend` — frontend container

## Local production rehearsal

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

## Required environment variables

- `DJANGO_SETTINGS_MODULE=config.settings.prod`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

## Deploy order

1. Provision the Azure foundation with Terraform
2. Apply the foundation once with blank app images
3. Build and push frontend/backend images to ACR
4. Apply Terraform again with image tags to create/update apps
5. Run migrations and smoke tests
6. Verify auth and redirects
7. Enable monitoring and alerts

## Staging-to-production flow

- **Staging** is the first live environment
  - used to validate infra, env vars, app deploys, auth, and smoke tests
- **Production** reuses the same Terraform modules and workflows
  - only the environment folder, state key, URLs, and secrets change
- The workflow should always be:
  - build
  - test
  - push
  - apply foundation
  - push images
  - apply app layer
  - smoke test
  - approve production

## Bootstrap note

- The first staging rollout currently uses ACR admin credentials to keep the pipeline simple and moving
- Once the flow is stable, the next hardening step is switching to managed identity and role assignments for ACR access

## Smoke tests

- Home page loads
- Login works
- Logout works
- Protected routes redirect unauthenticated users
- API health check returns `ok`

## Minimum launch checklist

- Production env vars present
- Migrations applied
- Static assets collected
- Logs visible
- Health checks passing
- Backup schedule enabled
- Admin access verified
- Staging deploy completed successfully before production
