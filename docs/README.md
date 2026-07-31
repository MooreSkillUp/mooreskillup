# MooreSkillUp Documentation

Everything written about this project lives here. The repository root keeps only
[README.md](../README.md), [QUICK_START.md](../QUICK_START.md) and
[PROJECT_ROADMAP.md](../PROJECT_ROADMAP.md) — the three things you need before
you know what you are looking for.

## I want to…

| …do this | Go here |
|---|---|
| Get the app running locally | [setup/LOCAL_DEVELOPMENT.md](setup/LOCAL_DEVELOPMENT.md) |
| Understand what's built and what's next | [../PROJECT_ROADMAP.md](../PROJECT_ROADMAP.md) |
| Contribute a change | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| Look up an API endpoint | [architecture/API_SCHEMA.md](architecture/API_SCHEMA.md) |
| Deploy to production | [deployment/deployment-guide.md](deployment/deployment-guide.md) |
| Handle an incident | [operations/runbook.md](operations/runbook.md) |

## Folders

**[phases/](phases/)** — how each role's module was designed and delivered.
Admin (Phase 1), Teacher (Phase 2), Student (Phase 3), Paystack (Phase 4).
Read these to understand *why* something works the way it does.

**[planning/](planning/)** — live working documents. The stabilization guide and
tracker, production readiness tracker, and execution roadmap. These change as
work proceeds.

**[architecture/](architecture/)** — how the system is built. API schema, backend
blueprint and structure, Django integration, admin architecture, the Super Admin
role, and the target production architecture.

**[setup/](setup/)** — getting environments running. Local development, env
variables, Docker commands, Vercel, Formspree.

**[deployment/](deployment/)** — shipping it. Deployment guide, Azure roadmap,
Docker, Railway, and the pre-deploy checklist.

**[ci-cd/](ci-cd/)** — pipeline structure and release flow.

**[terraform/](terraform/)** — infrastructure as code layout.

**[security/](security/)** — production security baseline.

**[operations/](operations/)** — runbook for support, rollback, and incidents.

**[guides/](guides/)** — practical how-tos, such as the admin developer guide.

**[testing/](testing/)** — the testing guide and manual role-based test scripts.

**[archive/](archive/)** — historical delivery reports and completion summaries.
Kept for context; **not** a description of how the system works today. Don't
trust these over the code.

## Sibling folders

- [`infrastructure/`](../infrastructure/) — Terraform and cloud structure
- [`scripts/`](../scripts/) — automation helpers
- [`nginx/`](../nginx/) — reverse-proxy examples for self-hosted deployments
