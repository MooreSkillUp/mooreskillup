# Deploying the backend to Azure

Frontend stays on Vercel. This is the API, the database and the storage behind
it, sized to cost as little as possible while you are still building.

Written for **Windows PowerShell**. Every command can be pasted as-is.

> Prices below are approximate and change. **Check the Azure pricing calculator
> before committing.** They show the shape of the bill, not a quote.

## What you are paying for

| Resource | Why | Rough monthly |
|---|---|---|
| Container Apps (API) | Runs Django. **Scales to zero when idle** | ~$0 idle, pennies per request |
| PostgreSQL Flexible Server `B1ms` | Your data | ~$16–19 |
| Container Registry (Basic) | Stores the Docker image | ~$5 |
| Blob Storage | Course banners, avatars, certificates | ~$1–2 |
| Key Vault | Secrets | under $1 |
| Log Analytics + App Insights | Logs and errors | pay per GB, a few $ |

**About $25/month while building — almost all of it the database.** Everything
else is either free when idle or a couple of dollars.

Three things were cut before this guide was written: Redis was provisioned but
the app never used it (~$16/mo for nothing), the registry was on Standard when
Basic does the same job, and the API was pinned to one always-on replica.

## If you are on a Visual Studio subscription

**You get a monthly Azure credit** — roughly $50 on Professional, $150 on
Enterprise. At ~$25/month this project fits inside either, so you may pay
nothing while building. Check yours at
[my.visualstudio.com/benefits](https://my.visualstudio.com/benefits).

**You cannot overspend by accident.** These subscriptions have a spending limit
on by default: when the credit runs out Azure *disables* the resources rather
than charging your card. Leave it on.

**The credit does not roll over.** Unused credit is gone at month end.

**It is licensed for development and testing only.** Microsoft's terms do not
permit production workloads on Visual Studio credit. It is the right home for
building and testing MooreSkillUp and the wrong home for the day real students
sign in and pay you. Before launch, create a **Pay-As-You-Go** subscription and
deploy there — same Terraform, different subscription id.

---

# Setup

## Step 1 — Install the two missing tools

You already have Docker and Python. Open **PowerShell as Administrator**:

```powershell
winget install --exact --id Microsoft.AzureCLI
winget install --exact --id Hashicorp.Terraform
```

**Close that window and open a normal PowerShell**, so the new tools are on your
PATH. Check both:

```powershell
az version
terraform version
```

Both printing a version means you are ready.

## Step 2 — Sign in

```powershell
az login
```

A browser opens. Sign in with the account that holds your subscription.

```powershell
az account list --output table
```

Find the one you want and select it:

```powershell
az account set --subscription "<subscription id from the table>"
az account show --output table
```

## Step 3 — Get your tenant id

```powershell
az account show --query tenantId --output tsv
```

Copy what it prints — you need it in step 5.

## Step 4 — Generate two secrets

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

One becomes the database password, the other `django_secret_key`. Keep both
somewhere safe; you will paste them next.

## Step 5 — Fill in your settings

```powershell
cd C:\TECH\Dev\mooreskillup\infrastructure\terraform
Copy-Item environments\prod\terraform.tfvars.example environments\prod\terraform.tfvars
notepad environments\prod\terraform.tfvars
```

Replace the contents with your real values:

```hcl
environment          = "prod"
location             = "southafricanorth"
tenant_id            = "<from step 3>"
django_allowed_hosts = "api.mooreskillup.org"
cors_allowed_origins = "https://mooreskillup.org,https://www.mooreskillup.org"
frontend_url         = "https://mooreskillup.org"
next_public_api_url  = "https://api.mooreskillup.org"
db_admin_username    = "msuadmin"
db_admin_password    = "<first secret from step 4>"
django_secret_key    = "<second secret from step 4>"
api_image            = ""
web_image            = ""
```

Save and close.

**On the region:** `southafricanorth` is the closest Azure region to Nigeria and
will feel noticeably faster for your students than a US region.

**On secrets:** `terraform.tfvars` holds live credentials. It is gitignored.
Keep it that way and never paste its contents anywhere public.

## Step 6 — See what will be created

```powershell
terraform init
terraform plan -var-file="environments/prod/terraform.tfvars"
```

**Read the last line.** It should say something like
`Plan: 14 to add, 0 to change, 0 to destroy.` — all *add*, no *destroy*.

**Nothing is billable yet.** If the plan looks wrong, stop here; nothing exists.

## Step 7 — Create it

```powershell
terraform apply -var-file="environments/prod/terraform.tfvars"
```

Type `yes` when prompted. **This takes 10–15 minutes** — the database is the
slow part. Leave it running.

When it finishes:

```powershell
terraform output
```

Keep `acr_login_server`, `api_url`, `postgres_host` and `resource_group_name`.

## Step 8 — Build and push the API image

Let Azure build it. This uploads your source and builds inside Azure, so it
works the same whether or not Docker is running locally:

```powershell
$ACR = terraform output -raw acr_login_server
$ACR_NAME = $ACR.Split('.')[0]

cd C:\TECH\Dev\mooreskillup
az acr build --registry $ACR_NAME --image api:latest --file backend/docker/django/Dockerfile .
```

That takes a few minutes. Then point the container app at the image:

```powershell
cd infrastructure\terraform
terraform apply -var-file="environments/prod/terraform.tfvars" -var="api_image=$ACR/api:latest"
```

## Step 9 — Check it is alive

```powershell
$API = terraform output -raw api_url
curl.exe "$API/api/platform/status/"
```

JSON back means the API is up and talking to the database.

**The first request may take 10–30 seconds** — that is the cold start, because
the app scales to zero when idle. Run it twice; the second is instant.

Migrations and the cache table are created automatically on first boot. To run
anything by hand:

```powershell
$RG = terraform output -raw resource_group_name
az containerapp exec --name api --resource-group $RG --command "python manage.py createsuperuser"
```

## Step 10 — Point Vercel at it

In Vercel → your project → **Settings → Environment Variables**:

```
NEXT_PUBLIC_API_URL = <the api_url from step 9>
```

Redeploy the frontend.

Then make sure the API lets it in: `cors_allowed_origins` in
`terraform.tfvars` must list your exact Vercel domain **including `https://`**.
If you change it, re-run:

```powershell
terraform apply -var-file="environments/prod/terraform.tfvars" -var="api_image=$ACR/api:latest"
```

## Step 11 — Set a budget alert before you walk away

In the portal: **Cost Management + Billing → Budgets → Add**. Set $40/month with
an email alert at 80%.

Do this on day one. Real usage always differs from an estimate.

---

# Running it day to day

## The API sleeps by itself

`container_apps_min_replicas` is `0`, so with no traffic Azure runs no
containers and you pay no compute. The first request after a quiet spell waits
10–30 seconds for a cold start.

**Before launch**, set it to `1` in `terraform.tfvars` and re-apply. That costs
roughly $15–30/month and removes cold starts entirely — nobody should meet a
30-second wait at a login screen.

## The database does not

PostgreSQL bills continuously whether or not anyone queries it. Stop it while
you are away:

```powershell
$RG = terraform output -raw resource_group_name
$PG = (terraform output -raw postgres_host).Split('.')[0]

az postgres flexible-server stop --name $PG --resource-group $RG
az postgres flexible-server start --name $PG --resource-group $RG
```

Storage still bills (~$4/mo) while stopped, and **Azure restarts a stopped
server automatically after 7 days**. It is for a week away, not indefinite
hibernation.

## Deploying a change later

```powershell
cd C:\TECH\Dev\mooreskillup
git pull
az acr build --registry $ACR_NAME --image api:latest --file backend/docker/django/Dockerfile .
cd infrastructure\terraform
terraform apply -var-file="environments/prod/terraform.tfvars" -var="api_image=$ACR/api:latest"
```

Migrations run on start, so a schema change deploys with the image.

## What changes at launch

| Setting | Building | Launch | Why |
|---|---|---|---|
| `container_apps_min_replicas` | `0` | `1` | No cold start at a login screen |
| Subscription | Visual Studio credit | Pay-As-You-Go | Production is not licensed on VS credit |
| Database SKU | `B_Standard_B1ms` | same until it hurts | Let Azure Monitor tell you |
| Backups | 7 days | 14–35 days | The default is thin once data is real |

Roughly **$45–70/month** after those changes.

**Do not upgrade the database pre-emptively.** `B1ms` is burstable and genuinely
fine for hundreds of students. When you do need more, the order is: raise
`max_replicas` first (cheapest), then the database tier, then add Redis back —
and only when the database cache shows real strain.

## Tearing it down

```powershell
terraform destroy -var-file="environments/prod/terraform.tfvars"
```

**This deletes the database and everything in it.** Take a backup first.

---

# When something goes wrong

**`az` or `terraform` not recognised** — you did not open a fresh PowerShell
after installing. Close and reopen.

**`terraform plan` complains about the subscription** — run `az account show`
and confirm you are on the right one.

**Apply fails partway** — safe to re-run. Terraform records what it created and
continues from there.

**Name already taken** — storage accounts and registries need globally unique
names. Change `project_name` in your tfvars and re-plan.

**API returns 500** — read the logs:

```powershell
az containerapp logs show --name api --resource-group $RG --follow
```

**Frontend gets CORS errors** — `cors_allowed_origins` does not exactly match
your Vercel domain. It must include the scheme and no trailing slash.

---

# Notes

**Running Render and Azure together** is fine. The frontend points at whichever
`NEXT_PUBLIC_API_URL` you give it and neither backend knows about the other.
Just ensure each one's `cors_allowed_origins` includes your Vercel domain.

**Media files** go to Blob Storage, so they survive container restarts. A
container's own filesystem does not — anything written there is lost on the next
deploy.

**Secrets** live in `terraform.tfvars` and `backend/.env`, both gitignored.
Nothing secret has ever been committed to this repository; keep that record
intact.

**Prefer not to install anything?** Azure Cloud Shell (the `>_` icon in
portal.azure.com) runs all of this in your browser with the tools pre-installed.
The only difference is you clone the repo there first.
