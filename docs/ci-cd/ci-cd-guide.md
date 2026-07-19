# CI/CD Guide

## Purpose

Keep every deploy repeatable and safe.

## Pipeline stages

1. Install dependencies
2. Lint and typecheck
3. Run targeted tests
4. Build frontend
5. Validate backend
6. Scan dependencies and container images
7. Build and tag images
8. Push to registry
9. Deploy Terraform foundation
10. Deploy app images
11. Smoke test staging
12. Manual approval
13. Deploy production
14. Smoke test production

## Suggested GitHub Actions jobs

- `frontend-check`
- `backend-check`
- `docker-build`
- `terraform-plan`
- `deploy-staging`
- `deploy-production`

## Release rules

- Only `main` may deploy production
- Tags should map to release versions
- Every production deploy should emit a changelog entry
- Staging must succeed before production approval
- Image tags must be immutable for release promotion

## Rollback strategy

- Keep the previous image tag available
- Keep Terraform state versioned and backed up
- Roll back by redeploying the last known good image
- If Terraform apply fails, re-run the last successful environment with the previous tag
