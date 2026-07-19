# Documentation Index

## Start here

- [README.md](./README.md): project overview and quick start
- [SETUP_GUIDE.md](./SETUP_GUIDE.md): local setup and frontend architecture
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md): current project state
- [docs/README.md](./docs/README.md): deployment and operations hub

## Backend docs

- [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md): implementation plan for the Django backend
- [API_SCHEMA.md](./API_SCHEMA.md): endpoint and payload contract for the frontend
- [docs/architecture/production-architecture.md](./docs/architecture/production-architecture.md): target production blueprint
- [docs/deployment/deployment-guide.md](./docs/deployment/deployment-guide.md): practical deploy steps
- [docs/deployment/azure-deployment-roadmap.md](./docs/deployment/azure-deployment-roadmap.md): full Azure staging-to-production roadmap
- [docs/ci-cd/ci-cd-guide.md](./docs/ci-cd/ci-cd-guide.md): pipeline overview
- [docs/terraform/terraform-guide.md](./docs/terraform/terraform-guide.md): infrastructure-as-code structure
- [docs/security/security-guide.md](./docs/security/security-guide.md): production security baseline
- [docs/operations/runbook.md](./docs/operations/runbook.md): incident and recovery guide

## Operational docs

- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md): phased execution plan
- [FORMSPREE_SETUP.md](./FORMSPREE_SETUP.md): contact page setup
- [BACKEND_DEPLOYMENT_CHECKLIST.md](./BACKEND_DEPLOYMENT_CHECKLIST.md): backend deployment checklist
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md): Docker workflow and host deployment
- [VERCEL_SETUP.md](./VERCEL_SETUP.md): frontend deployment path

## Frontend route map

| Route | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/login` | `src/app/login/page.tsx` |
| `/register` | `src/app/register/page.tsx` |
| `/dashboard` | `src/app/dashboard/page.tsx` |
| `/courses` | `src/app/courses/page.tsx` |
| `/course/[id]` | `src/app/course/[id]/page.tsx` |
| `/lesson/[id]` | `src/app/lesson/[id]/page.tsx` |
| `/quiz/[id]` | `src/app/quiz/[id]/page.tsx` |
| `/leaderboard` | `src/app/leaderboard/page.tsx` |
| `/achievements` | `src/app/achievements/page.tsx` |
| `/certificates` | `src/app/certificates/page.tsx` |
| `/settings` | `src/app/settings/page.tsx` |
| `/contact` | `src/app/contact/page.tsx` |

## Data source map

| Concern | Current source |
| --- | --- |
| auth | `src/lib/auth.tsx` |
| courses and lessons | `src/lib/mock-data.ts` |
| quizzes | `src/lib/quiz-data.ts` |
| leaderboard and badges | `src/lib/gamification.ts` |
| certificates | `src/lib/certificate.ts` |
| public envs | `src/lib/public-env.ts` |

## Backend build order

1. Users and auth
2. Courses, modules, lessons
3. Progress tracking
4. Quizzes and submissions
5. Certificates
6. Leaderboard and achievements
7. Contact and support integrations if needed
