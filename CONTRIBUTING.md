# Contributing to MooreSkillUp

How work moves from an idea to production. Short version: `main` is always
deployable, everything else is a short-lived branch, CI decides what merges —
and **merging to `main` deploys to production automatically.**

## The branching model

We use **trunk-based development**.

```
main ──────●────────●────────●────────●──▶   always deployable, protected, auto-deploys
            \      /          \      /
             ●────●            ●────●        short-lived branches (days, not months)
```

- **`main`** is the single source of truth. Protected, always deployable.
- **Every change gets its own branch**, cut fresh from `main`.
- **Branches live days, not months.** If a branch runs long it has grown too
  big — split it. A branch that drifts is how `main` ends up months behind
  reality, and how eleven commits sit unmerged for a week.
- **Nothing lands on `main` without a pull request that passes CI.**

### Branch naming

`<type>/<short-description>` in kebab-case:

| Prefix | For |
|---|---|
| `feat/` | New capability — `feat/teacher-t1-workspace` |
| `fix/` | Bug fix — `fix/payment-callback-redirect` |
| `chore/` | Tooling, deps, config — `chore/repo-structure` |
| `refactor/` | Restructuring with no behaviour change |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `wip/` | Work parked for later — never merged directly |

Name the branch after **what it delivers**, not the ticket or the first file you
happened to touch.

---

## The flow, start to finish

Every change goes through these six steps. Copy them.

### 1. Start from an up-to-date main

```bash
git checkout main
git pull                                   # never branch from a stale main
git checkout -b feat/admin-course-review
```

### 2. Work, committing as you go

```bash
git add -A
git commit                                 # write a real message — see below
```

### 3. Run the checks before CI does

```bash
# Frontend (from the repo root)
npx tsc --noEmit
npx next lint --dir src

# Backend (containers must be up: docker compose up -d)
docker compose exec -T api python -m pytest -q
docker compose exec -T api ruff check apps common config
docker compose exec -T api python manage.py makemigrations --check --dry-run

# Infrastructure, only if you touched it
cd infrastructure/terraform && terraform fmt -check -recursive && terraform validate
```

All green here means all green in CI. They are the same commands.

### 4. Push and open the PR

```bash
git push -u origin feat/admin-course-review

gh pr create --base main \
  --title "What this delivers, in plain words" \
  --body "..."                             # fill the template, don't leave it blank
```

Push early — a branch that exists only on your laptop is one spilled coffee from
gone. You can push a half-finished branch; just don't open the PR yet.

### 5. Wait for green

```bash
gh pr checks --watch
```

Five checks must pass: **Backend**, **Frontend**, **validate** (Terraform),
**Vercel**, **Vercel Preview Comments**.

If one fails, fix it on the branch and push again. Never merge red.

### 6. Merge, and clean up

```bash
gh pr merge --merge --delete-branch        # --merge, not --squash
git checkout main && git pull              # bring your local main forward
```

Use `--merge`, not `--squash`. Squashing a branch into one commit throws away
*why* each change was made, which is the part you want in six months.

**`git pull` after merging is not optional.** The merge happens on GitHub; your
local `main` knows nothing about it until you pull. Skip this and your next
branch is cut from stale code.

### 7. Watch the deploy

Merging to `main` deploys. Confirm it landed:

```bash
gh run watch
```

---

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <what changed, imperative mood>

Why it changed, and anything a reader would otherwise have to guess.
```

Same types as branch prefixes. Real example:

```
fix(payments): production was giving paid courses away

PAYSTACK_SECRET_KEY was never passed to the container app, so the API ran in
Paystack's simulation mode on the live server: checkout bounced straight to the
callback, verify returned success unconditionally, and the student was enrolled
having paid nothing. No error, no log line, no money.
```

Explain **why**, not just what. The diff already shows what.

---

## Pull requests

**Keep them small.** A 400-line PR gets a real review. A 4,000-line PR gets a
rubber stamp — and that is exactly when things break.

Fill in the template. A PR body that still contains `<!-- One or two sentences -->`
is a PR nobody can review, including you in three months.

The template asks for three things, and each earns its place:

- **What this changes** — one or two sentences.
- **Why** — the problem. If it fixes something, describe the broken behaviour.
- **How to check it** — which role, which page, what should happen. Written so
  someone else can verify it without reading the diff.

---

## Environments

There is **one environment**. `main` is production.

| What happens | Where it goes |
|---|---|
| Push to any branch, open a PR | CI runs. Vercel builds a preview. Nothing else. |
| **Merge to `main`** | **Django API auto-deploys to Azure Container Apps** |
| **Merge to `main`** | **Frontend auto-deploys to Vercel** |

The API deploy only fires when `backend/**` or `infrastructure/terraform/**`
changed — a docs-only or frontend-only merge skips it. Vercel builds from the
repository on its own, independently of our workflow.

There is deliberately **no staging**. A second environment means a second
database, and that cost is not worth paying until real students depend on the
platform. Add one when they do, not before.

**What this means in practice:** merging is a deploy. Treat the merge button as
the deploy button, because it is. If a change is risky, merge it when you can
watch it, not at midnight.

To roll back, re-run the `Deploy` workflow from an earlier commit.

---

## Secrets

Never commit a `.env`. `.env` and `backend/.env` are gitignored — keep it that
way. When you add a new environment variable, add it to the matching
`.env.example` with a placeholder so the next person knows it exists.

Production configuration lives in **GitHub → Settings → Secrets and variables →
Actions**, and is passed to Terraform by the deploy workflow. Nothing is stored
in `terraform.tfvars` — that file is gitignored and the workflow does not read it.

Secrets (hidden once saved):

| Name | What breaks without it |
|---|---|
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | Deploy cannot authenticate |
| `TF_STATE_*` | Terraform cannot find its state |
| `DB_ADMIN_PASSWORD` | Database access |
| `DJANGO_SECRET_KEY` | Sessions and signing |
| `BREVO_API_KEY` | **No email is sent at all** — invites, resets, completions |
| `PAYSTACK_SECRET_KEY` | **Paid checkout refuses** |

Variables (visible):

| Name | Purpose |
|---|---|
| `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` | Domains |
| `DB_ADMIN_USERNAME`, `TF_ENVIRONMENT`, `TF_LOCATION` | Infrastructure |
| `AUTH_RETURN_REFRESH_IN_BODY` | The cross-domain session fallback |
| `DEFAULT_FROM_EMAIL` | From address on every email |
| `PAYSTACK_PUBLIC_KEY` | Checkout |

**Adding a new one takes three edits**, and missing any of them means the value
silently never reaches the server:

1. `infrastructure/terraform/variables.tf` — declare it
2. `infrastructure/terraform/modules/container_apps/main.tf` — pass it as an `env` block
3. `.github/workflows/deploy-production.yml` — add `-var="name=${{ secrets.NAME }}"`

Both silent production failures in this codebase were exactly this: a key that
existed in settings but was never wired through to the container, on a code path
that works perfectly in development.

---

## Running the checks locally

CI runs precisely the commands in step 3 above. Two gotchas worth knowing:

**Tests in Docker need `--ds`.** The `api` container exports
`DJANGO_SETTINGS_MODULE=config.settings.dev`, and an environment variable
outranks `pytest.ini`. `pytest.ini` now passes `--ds=config.settings.test` in
`addopts` to force it — without that, the suite silently points at Postgres and
produces dozens of setup errors that have nothing to do with your change.

**Tests run on SQLite, production on PostgreSQL.** Anything relying on
Postgres-specific behaviour — `select_for_update` in payment fulfilment, for
instance — needs a manual check against a real database.

---

## Definition of done

- [ ] It works against real data, not placeholders
- [ ] Backend behaviour has a test
- [ ] `tsc`, `lint`, `pytest`, `ruff`, `makemigrations --check` all pass
- [ ] New env vars are in `.env.example` **and** wired through all three Terraform/workflow files
- [ ] Docs updated if behaviour changed
- [ ] **You opened the running app and looked at the screen**

That last one is not ceremony. Nearly every real defect in this codebase was the
same shape — the interface claiming something the data could not back: a
completion rate with nobody behind it, a payment that took no money, an email
that reached no inbox, a step ticked green on an empty course. None were
catchable by typecheck, lint, or a green test suite. Most were found by looking.

**On placeholder data:** shipping UI backed by hardcoded arrays is how a product
ends up looking finished while doing nothing. If real data isn't available yet,
either build the backend for it or mark the feature clearly as coming soon —
don't fake it.
