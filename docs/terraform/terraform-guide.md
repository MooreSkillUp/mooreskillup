# Terraform Guide

## Repository layout

- `infrastructure/terraform/modules/` — reusable building blocks
- `infrastructure/terraform/environments/dev/` — dev values and state
- `infrastructure/terraform/environments/staging/` — staging values and state
- `infrastructure/terraform/environments/prod/` — production values and state

## State management

- Use remote state
- Enable locking
- Separate state by environment
- Never commit state files
- Keep one backend key per environment
- Bootstrap the state storage account once, then manage everything else in Terraform

## Module strategy

- Build small modules with clear inputs and outputs
- Keep networking, compute, data, and observability separate
- Prefer explicit dependencies over hidden coupling
- The current bootstrap scaffold uses ACR admin credentials for image push/pull during the first staging rollout
- Replace that with managed identity and AcrPull/AcrPush role assignments before the final production hardening pass

## Promotion model

1. Plan in dev
2. Apply foundation to staging
3. Apply app images to staging
4. Validate staging
5. Approve production
6. Apply foundation to production
7. Apply app images to production
