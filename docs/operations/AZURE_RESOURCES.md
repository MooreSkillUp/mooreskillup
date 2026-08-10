# Your Azure setup, explained

What is running, where to find it, what each thing does, and how to operate it.
Written after the first successful deployment, against what is actually there.

## The short version

Your backend runs on **Azure Container Apps** in **South Africa North** — the
closest region to Nigeria. It talks to a **PostgreSQL** database, stores uploads
in **Blob Storage**, and writes its logs to **Application Insights**. The
frontend is separate, on Vercel.

**Live API:**
```
https://mooreskillup-prod-api.orangedesert-5efa1454.southafricanorth.azurecontainerapps.io
```

**Cost:** about $25/month, nearly all of it the database. The API costs nothing
while idle.

---

## Finding it in the portal

The subscription contains **27 resource groups** from several different
projects, so yours are easy to lose. Don't browse — search.

Type this into the portal's top search bar:

```
rg-mooreskillup-prod
```

Then **click the star** next to the name to pin it to your sidebar. You will
open this most days.

**Direct link:**

```
https://portal.azure.com/#@c579f8a6-171d-4be4-ba33-68b16a8ae922/resource/subscriptions/eb859bc0-402f-429b-9ef4-6ebfb5cd9a5d/resourceGroups/rg-mooreskillup-prod/overview
```

**Seeing nothing at all?** You are in the wrong directory. Profile picture
(top-right) → **Switch directory** → pick the one ending
`c579f8a6-171d-4be4-ba33-68b16a8ae922`. Also check the subscription filter (the
funnel icon) has *Visual Studio Enterprise Subscription* ticked.

### Your two resource groups

| Group | Holds | Touch it? |
|---|---|---|
| `rg-mooreskillup-prod` | The whole application | Yes, daily |
| `rg-msu-tfstate` | Terraform's state file | **No.** Deleting this orphans everything Terraform manages |

---

## What each resource does

### `mooreskillup-prod-api` — your Django API ⭐

The one you will open most. It runs the container built from your code.

- **Monitoring → Log stream** — live logs. First place to look when something breaks.
- **Revisions** — every deployment creates one. Roll back by activating an older revision.
- **Scale** — currently 0 to 3 replicas.
- **Overview → Application Url** — the public address.

**Scales to zero.** With no traffic Azure runs no containers and charges no
compute. The first request after a quiet spell takes 10–30 seconds to wake. That
is the cold start, and it is the thing keeping the bill near nothing.

### `psqlmooreskillupprod` — PostgreSQL 16 ⭐

Every student, course, enrolment and payment. The only resource that costs money
whether or not anyone uses it.

- **Stop / Start** — the buttons that control your bill. See below.
- **Backup and restore** — 7 days of automatic backups; point-in-time restore.
- **Networking** — one firewall rule, `AllowAzureServices`.

**This is your most valuable resource.** Everything else can be rebuilt from
code in twenty minutes. This cannot.

### `acrmooreskillupprod` — container registry

Stores the Docker images. **Repositories → api** shows every version built.

### `stmooreskillupprod` — blob storage

Three containers: `media` (course banners, avatars), `certificates`,
`backups`. Browse under **Storage browser**.

Uploads go here rather than to the container's own disk, because a container's
filesystem is wiped on every deploy.

### `appi-mooreskillup-prod` — Application Insights

Where you find out what broke without reading raw logs.

- **Failures** — every 500, grouped, with the traceback
- **Performance** — which endpoints are slow
- **Live metrics** — real-time traffic

### `law-mooreskillup-prod` — Log Analytics

Raw log storage behind Application Insights. You rarely open it directly.

### `kvmooreskillupprod` — Key Vault

A secrets store. Currently provisioned but barely used — secrets are passed as
container environment variables. Moving them here is a worthwhile hardening step
before launch.

### `acae-mooreskillup-prod` — Container Apps environment

The networking and logging boundary your API runs inside. Set up once, ignored
thereafter.

### `Failure Anomalies` — an alert rule

Created automatically with Application Insights. Emails you when the error rate
jumps unusually. Leave it on.

---

## Controlling what you spend

### The API is already free when idle

`container_apps_min_replicas = 0`, so no traffic means no compute charge. The
cost is a 10–30 second cold start on the first request afterwards.

**Change this before launch.** No student should meet a 30-second wait at a
login screen. Set it to `1` in `terraform.tfvars` and re-apply — roughly
$15–30/month for an always-warm instance.

### The database is not

It bills continuously. Stop it while you are away:

**In the portal:** `psqlmooreskillupprod` → **Stop** (top of the Overview page).

**From the terminal:**

```powershell
az postgres flexible-server stop --name psqlmooreskillupprod --resource-group rg-mooreskillup-prod
az postgres flexible-server start --name psqlmooreskillupprod --resource-group rg-mooreskillup-prod
```

Two things to know: storage still bills (~$4/month) while stopped, and **Azure
restarts a stopped server automatically after 7 days**. It is for a week away,
not indefinite hibernation.

### Watching the bill

Search **Cost Management** → **Cost analysis** → scope to `rg-mooreskillup-prod`.

Set a budget on day one: **Budgets → Add**, $40/month, email alert at 80%.

Your Visual Studio Enterprise credit is roughly $150/month, and the spending
limit is on by default — so if the credit runs out Azure disables the resources
rather than charging a card. Leave that limit on.

---

## Deploying a change

Three commands from the repository root:

```powershell
az acr build --registry acrmooreskillupprod --image api:latest --file backend/docker/django/Dockerfile . --no-logs

$rev = az containerapp revision list --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod --query "[0].name" -o tsv
az containerapp revision restart --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod --revision $rev
```

Migrations and the cache table are created on start, so a schema change ships
with the image.

**Infrastructure changes** (sizing, environment variables, scaling) go through
Terraform instead:

```powershell
cd infrastructure\terraform
terraform plan -var-file="environments/prod/terraform.tfvars"
terraform apply -var-file="environments/prod/terraform.tfvars"
```

Always read the plan. It should never say *destroy* unless you meant it.

---

## When something breaks

**Start here — live logs:**

```powershell
az containerapp logs show --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod --tail 50
```

Or portal → `mooreskillup-prod-api` → **Monitoring → Log stream**.

| Symptom | Usually means |
|---|---|
| **First request slow, then fine** | Cold start. Working as designed |
| **400 Bad Request** | Hostname not in `DJANGO_ALLOWED_HOSTS`. Django's wildcard is a leading dot (`.azurecontainerapps.io`), never an asterisk |
| **500 on everything** | Read the logs — the traceback is there now |
| **Hangs on "Waiting for database..."** | Database stopped, or the firewall rule is missing |
| **Frontend blocked by CORS** | `cors_allowed_origins` does not exactly match your Vercel domain. Scheme included, no trailing slash |
| **`no such file or directory` for a script that exists** | CRLF line endings. Linux is complaining about the interpreter, not the file |

---

## What is deliberately not done yet

Honest list of what is missing, so nothing is a surprise later.

**The database is publicly reachable** (behind a firewall rule limiting it to
Azure services). VNet integration with a private endpoint would remove public
access entirely. Worth doing before real student data lives here.

**Secrets are environment variables, not Key Vault.** The vault exists but is
not wired up. Fine for now; better before launch.

**Backups are 7 days.** Thin once the data is real. 14–35 days at launch.

**No staging environment.** The Terraform supports one — `environments/staging`
already exists. Deploying it is a repeat of the production steps with a
different tfvars file.

**No custom domain.** The API answers on an `azurecontainerapps.io` address.
`api.mooreskillup.org` needs a DNS record and a certificate binding.

**Production runs on Visual Studio credit**, which Microsoft licenses for
development and testing only. Real students mean a Pay-As-You-Go subscription.

---

## Rebuilding from nothing

Everything except the database can be recreated from this repository:

```powershell
cd infrastructure\terraform
terraform init -backend-config="resource_group_name=rg-msu-tfstate" -backend-config="storage_account_name=stmsutfstate34453" -backend-config="container_name=tfstate" -backend-config="key=production.terraform.tfstate"
terraform apply -var-file="environments/prod/terraform.tfvars"
```

**The database is the exception.** Back it up before anything destructive.

---

## Reference

| Thing | Value |
|---|---|
| Subscription | `eb859bc0-402f-429b-9ef4-6ebfb5cd9a5d` (Visual Studio Enterprise) |
| Tenant | `c579f8a6-171d-4be4-ba33-68b16a8ae922` |
| Region | `southafricanorth` |
| Resource group | `rg-mooreskillup-prod` |
| Terraform state | `rg-msu-tfstate` / `stmsutfstate34453` / `tfstate` |
| Database host | `psqlmooreskillupprod.postgres.database.azure.com` |
| Registry | `acrmooreskillupprod.azurecr.io` |

Secrets live in `infrastructure/terraform/environments/prod/terraform.tfvars`,
which is gitignored and must stay that way.
