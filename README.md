# MooreSkillUp

MooreSkillUp is a full-stack learning platform with a Next.js frontend and a Django REST backend.

The repository now includes session-backed auth, production Docker support, and a deployment blueprint you can build on while the remaining feature gaps are closed.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Django REST Framework
- PostgreSQL
- Redis
- Docker

## Current routes

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/courses`
- `/course/[id]`
- `/lesson/[id]`
- `/quiz/[id]`
- `/leaderboard`
- `/achievements`
- `/certificates`
- `/settings`
- `/contact`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment docs

- `docs/README.md`
- `docs/architecture/production-architecture.md`
- `docs/deployment/deployment-guide.md`
- `docs/deployment/azure-deployment-roadmap.md`
- `docs/ci-cd/ci-cd-guide.md`
- `docs/terraform/terraform-guide.md`
- `docs/security/security-guide.md`
- `docs/operations/runbook.md`

## Documentation map

- `DOCUMENTATION_INDEX.md`
- `PROJECT_SUMMARY.md`
- `DEVELOPMENT_ROADMAP.md`
- `FORMSPREE_SETUP.md`
- `BACKEND_DEPLOYMENT_CHECKLIST.md`
- `DOCKER_DEPLOYMENT.md`
- `VERCEL_SETUP.md`

## Notes

- The active app is the Next.js App Router implementation under `src/app`.
- The current build, lint, and typecheck all pass.
