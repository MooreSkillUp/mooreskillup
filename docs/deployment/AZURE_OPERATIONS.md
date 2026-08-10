# Your Azure setup, explained

What is running, where to find it, what it costs, and how to switch it off.

This describes the **live production deployment** as it actually exists, not a
plan. Everything here was verified against the running system.

---

## The short version

| | |
|---|---|
| **API** | `https://mooreskillup-prod-api.orangedesert-5efa1454.southafricanorth.azurecontainerapps.io` |
| **Django admin** | that URL + `/admin/` |
| **Subscription** | Visual Studio Enterprise (`eb859bc0-402f-429b-9ef4-6ebfb5cd9a5d`) |
| **Directory / tenant** | `c579f8a6-171d-4be4-ba33-68b16a8ae922` |
| **Region** | South Africa North — closest Azure region to Nigeria |
| **Resource groups** | `rg-mooreskillup-prod` (the app), `rg-msu-tfstate` (Terraform state) |

**Note the API address has no `--0000001` in it.** That suffix belongs to a
*revision* and changes on every deploy. Always use the address above.

---

## Finding it in the portal

That subscription holds 27 resource groups from other projects, so browsing is
hopeless. Instead:

1. [portal.azure.com](https://portal.azure.com)
2. Type **`rg-mooreskillup-prod`** in the **top search bar**
3. Click the result
4. **Click the star** next to its name — it now lives in your left sidebar

**Seeing nothing?** You are in the wrong directory. Profile picture (top right)
→ **Switch directory** → the one ending `c579f8a6-...`. Also check the
subscription filter (funnel icon) includes *Visual Studio Enterprise*.

---

## What each resource does

Nine resources in `rg-mooreskillup-prod`. Two you will use constantly, the rest
rarely.

### ⭐ `mooreskillup-prod-api` — your Django API

The thing that actually serves requests. Inside it:

- **Monitoring → Log stream** — live logs. First place to look when something
  breaks.
- **Revisions** — every deploy creates one. Shows which is live and how many
  replicas are running.
- **Scale** — min and max replicas. Currently **min 0**, so it sleeps when idle.
- **Containers** — the image it runs and its environment variables.

### ⭐ `psqlmooreskillupprod` — PostgreSQL

Every user, course, payment and certificate. Inside it:

- **Stop / Start** at the top — the main cost control
- **Backup and restore** — 7-day retention, point-in-time restore
- **Networking** — firewall rules. "Allow Azure services" is on, which is how
  the API connects.

### The rest

| Resource | What it is | When you would open it |
|---|---|---|
| `acrmooreskillupprod` | Container registry | Check which image versions exist |
| `stmooreskillupprod` | Blob storage | Browse uploaded banners, avatars, certificates |
| `kvmooreskillupprod` | Key Vault | Secrets store |
| `appi-mooreskillup-prod` | Application Insights | Error rates, response times, failed requests |
| `law-mooreskillup-prod` | Log Analytics | Raw log storage behind the above |
| `acae-mooreskillup-prod` | Container Apps environment | The host the API runs inside |
| `Failure Anomalies` | Auto-created alert | Emails you when errors spike |

`rg-msu-tfstate` holds one storage account with Terraform's state file. **Do not
touch it.** Deleting it means Terraform forgets everything it built.

---

## What it costs

| Resource | Roughly per month |
|---|---|
| PostgreSQL `B1ms` + 32GB | $16–19 |
| Container Registry (Basic) | $5 |
| Blob Storage | $1–2 |
| Log Analytics + App Insights | a few $ |
| Key Vault | under $1 |
| **Container Apps** | **~$0 while idle** |
| **Total** | **~$25** |

Verify against the Azure pricing calculator before budgeting — these are
approximations to show the shape of the bill.

**Your Visual Studio Enterprise credit is roughly $150/month**, so this sits
comfortably inside it. You are likely paying nothing today.

Three things were cut to get here: Redis (~$16/mo) was provisioned but the app
never used it, the registry was on Standard when Basic does the same job, and
the API was pinned to one always-on replica.

### Two rules about that credit

**It cannot overspend.** Visual Studio subscriptions have a spending limit on by
default — when credit runs out, Azure *disables* resources rather than charging
a card. Leave that on.

**It is licensed for dev and test only.** Microsoft's terms do not permit
production workloads on Visual Studio credit. Fine for building. Before real
students sign in and pay you, create a **Pay-As-You-Go** subscription and deploy
there — same Terraform, different subscription id.

---

## Switching it off

### The API switches itself off

`container_apps_min_replicas = 0`, so with no traffic Azure runs no containers
and charges no compute. The first request after a quiet spell takes **10–30
seconds** to wake. Run it twice; the second is instant.

That wait is the thing saving you money. **Before launch**, set it to `1` and
re-apply — no student should meet a 30-second pause at a login screen.

### The database does not

It bills continuously whether or not anyone queries it. Stop it when away:

```powershell
az postgres flexible-server stop --name psqlmooreskillupprod --resource-group rg-mooreskillup-prod
az postgres flexible-server start --name psqlmooreskillupprod --resource-group rg-mooreskillup-prod
```

Or the **Stop** button on the database's portal page.

Two caveats: storage still bills (~$4/mo) while stopped, and **Azure restarts a
stopped server automatically after 7 days**. It is for a week away, not
hibernation.

### Everything off

```powershell
terraform destroy -var-file="environments/prod/terraform.tfvars"
```

**Deletes the database and all its data.** Only for starting over.

---

## Day-to-day

### Deploy a change

```powershell
cd C:\TECH\Dev\mooreskillup
git pull
az acr build --registry acrmooreskillupprod --image api:latest --file backend/docker/django/Dockerfile .
cd infrastructure\terraform
terraform apply -var-file="environments/prod/terraform.tfvars"
```

Migrations run automatically on start, so a schema change ships with the image.

### Watch the logs

```powershell
az containerapp logs show --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod --follow
```

Or **Log stream** in the portal.

### Run a Django command

```powershell
az containerapp exec --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod --command "python manage.py <command>"
```

The container must be awake — hit the API URL first if it has scaled to zero.

### Check spending

Portal → search **Cost Management** → **Cost analysis** → scope to
`rg-mooreskillup-prod`.

Set a budget alert on day one: **Cost Management → Budgets → Add**, $40/month
with an email at 80%.

---

## Accounts

**One account covers both admins.** `create_superuser` sets `role="admin"`,
`admin_role="super_admin"`, `is_staff` and `is_superuser` together — so the same
email and password work for Django's `/admin/` and for the MooreSkillUp admin
platform at `/admin/dashboard`.

| | |
|---|---|
| Email | `admin@mooreskillup.org` |
| Django admin | API URL + `/admin/` |
| Platform admin | Sign in through the frontend |

**Change that password on first login.** It was generated on the command line
and passed through a terminal, so treat it as temporary.

Django's `/admin/` is the low-level table editor — useful for fixing data
directly. The MooreSkillUp admin is the real product: courses, students,
teachers, payments, approvals. Use the platform admin for daily work and Django's
only when you need to reach in and correct something.

---

## Vercel and domains

The frontend lives on Vercel and reaches this API. In Vercel → Settings →
Environment Variables:

```
NEXT_PUBLIC_API_URL = https://mooreskillup-prod-api.orangedesert-5efa1454.southafricanorth.azurecontainerapps.io
```

**Use exactly that address** — no revision suffix, or it breaks on the next
deploy.

The API must also allow the frontend's origin. `cors_allowed_origins` in
`terraform.tfvars` currently lists `https://mooreskillup.vercel.app`. Add any new
domain there and re-apply, or the browser blocks every request.

### Custom domains

**Vercel does not charge for adding a custom domain**, on Hobby or Pro. You pay
your registrar for the domain itself; pointing it at Vercel and the HTTPS
certificate are free.

When you get one, three things change together:

1. Add the domain in **Vercel → Settings → Domains** and set the DNS records
   Vercel gives you
2. Add it to `cors_allowed_origins` **and** `frontend_url` in `terraform.tfvars`,
   then `terraform apply`
3. Optionally give the API its own subdomain (`api.mooreskillup.org`) — a custom
   domain on the container app plus a DNS CNAME. `django_allowed_hosts` already
   lists it.

Miss step 2 and the site loads but every API call fails with a CORS error.

---

## When something breaks

**API returns 500** — read the logs. Production logging now writes to stdout, so
tracebacks appear in Log stream. Without that config Django would send errors to
email and the logs would show nothing.

**API returns 400 with "Invalid HTTP_HOST"** — the hostname is missing from
`django_allowed_hosts`.

**Frontend gets CORS errors** — `cors_allowed_origins` does not exactly match the
site's origin. Scheme included, no trailing slash.

**First request hangs then works** — normal cold start.

**`terraform apply` says the state is locked** — an earlier run was interrupted.
Take the lock ID from the error and run
`terraform force-unlock <id>`.

**Apply fails partway** — safe to re-run. Terraform records what it created and
continues.

---

## What is not set up yet

Honest list, so nothing is a surprise later.

- **No custom domain.** Running on the Azure and Vercel default hostnames.
- **No CI/CD to Azure.** The workflows exist but need `TF_STATE_*` and Azure
  credentials as GitHub secrets. Deploys are manual today.
- **No staging environment.** The Terraform supports one; only prod is deployed.
- **The production database is empty.** No courses, no students. Only the admin
  account exists.
- **Media still writes to the container filesystem.** Blob Storage is
  provisioned but Django is not configured to use it, so **uploaded images are
  lost on every deploy**. Fix before real teachers upload anything.
- **No custom alerting** beyond the auto-created Failure Anomalies rule.
