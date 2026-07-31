# Contributing to MooreSkillUp

How work moves from an idea to production. Short version: `main` is always
deployable, everything else is a short-lived branch, and CI decides what merges.

## The branching model

We use **trunk-based development**.

```
main ──────●────────●────────●────────●──▶   always deployable, protected
            \      /          \      /
             ●────●            ●────●        short-lived branches (days, not months)
```

- **`main`** is the single source of truth. It is protected, always deployable,
  and auto-deploys to staging.
- **Every change gets its own branch**, cut fresh from `main`.
- **Branches live days, not months.** If a branch runs long, it has grown too
  big — split it. A branch that drifts for months is how `main` ends up months
  behind reality.
- **Nothing lands on `main` without a pull request that passes CI.**

### Branch naming

`<type>/<short-description>` in kebab-case:

| Prefix | For |
|---|---|
| `feat/` | New capability — `feat/student-dashboard` |
| `fix/` | Bug fix — `fix/payment-callback-redirect` |
| `chore/` | Tooling, deps, config — `chore/repo-structure` |
| `refactor/` | Restructuring with no behaviour change |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `wip/` | Work parked for later — never merged directly |

Name the branch after **what it delivers**, not the ticket or the first thing you
happened to touch.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <what changed, imperative mood>

Why it changed, and anything a reader would otherwise have to guess.
```

Same types as branch prefixes. Real example:

```
ci: run the test suite and type checks as real merge gates

The backend CI job only ran 'manage.py check' - all 115 tests were never
executed, so a change could break every one of them and CI would still pass.
```

Explain **why**, not just what. The diff already shows what.

## Pull requests

1. Cut a branch from an up-to-date `main`.
2. Make the change. Keep it to one concern.
3. Run the checks locally (below) — don't make CI find it for you.
4. Push and open a PR, filling in the template.
5. CI must be green. Then merge, and delete the branch.

**Keep PRs small.** A 400-line PR gets a real review. A 4,000-line PR gets a
rubber stamp — and that is exactly when things break.

## Running the checks locally

CI runs precisely these. If they pass here, they pass there.

### Frontend

```bash
npm ci
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # next build (also fails on type errors)
```

### Backend

```bash
cd backend
.venv/Scripts/python.exe -m pytest -q                     # Windows
python -m pytest -q                                       # macOS / Linux

python manage.py check
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run
```

The last one catches a model changed without a migration — a class of bug that
only shows up at deploy time otherwise.

Tests run against in-memory SQLite (`config/settings/test.py`) so they need no
database service. Production runs PostgreSQL, so anything relying on
Postgres-specific behaviour needs a manual check against a real database.

## Environments

| Branch | Goes to | How |
|---|---|---|
| any branch | nothing | CI runs on the PR only |
| `main` | **staging** | Automatic on push |
| `main` | **production** | Manual — `Deploy Production` workflow |

Production is deliberately manual. Merging to `main` never surprises real users.

## Secrets

Never commit a `.env`. `.env`, `backend/.env` and `backend/.env.railway` are
gitignored — keep it that way. When you add a new environment variable, add it to
the matching `.env.example` with a placeholder so the next person knows it exists.

## Definition of done

A change is done when:

- [ ] It works against real data, not placeholders
- [ ] Backend behaviour has a test
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass
- [ ] `pytest` passes
- [ ] New env vars are in `.env.example`
- [ ] Docs updated if behaviour changed

**On placeholder data:** shipping UI backed by hardcoded arrays is how a product
ends up looking finished while doing nothing. If real data isn't available yet,
either build the backend for it or mark the feature clearly as coming soon —
don't fake it.
