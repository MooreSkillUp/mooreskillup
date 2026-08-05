# Deploying the backend to Azure

Frontend stays on Vercel. This is the API, the database, and the storage behind
it — sized to cost as little as possible while you are still building.

> Prices below are approximate and change. **Check the Azure pricing calculator
> before you commit to anything.** They are here to show you the shape of the
> bill, not to be quoted back at Microsoft.

## What you get

| Resource | Why | Rough monthly |
|---|---|---|
| Container Apps (API) | Runs Django. **Scales to zero when idle** | ~$0 idle, pennies per request |
| PostgreSQL Flexible Server `B1ms` | Your data | ~$16–19 |
| Container Registry (Basic) | Stores the Docker image | ~$5 |
| Blob Storage | Course banners, avatars, certificates | ~$1–2 |
| Key Vault | Secrets | under $1 |
| Log Analytics + App Insights | Logs and errors | pay per GB, a few $ |

**Expect ~$25/month while building**, almost all of it the database.

Three things were trimmed before this guide was written: Redis was provisioned
but the app never used it (~$16/mo for nothing), the registry was on Standard
when Basic does the same job, and the API was pinned to one always-on replica.

## Before you start

- An Azure account with an active subscription
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed
- Docker running locally
- Terraform (or run it through Docker — shown below)

## 1. Sign in and pick a subscription

```bash
az login
az account list --output table
az account set --subscription "<your subscription id>"
az account show --query "{name:name, id:id, tenant:tenantId}" --output table
```

Keep the **tenant id** — Terraform needs it.

## 2. Fill in your variables

```bash
cd infrastructure/terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
environment          = "prod"
location             = "southafricanorth"   # closest region to Nigeria
tenant_id            = "<from step 1>"
django_allowed_hosts = "api.mooreskillup.org"
cors_allowed_origins = "https://mooreskillup.org,https://www.mooreskillup.org"
frontend_url         = "https://mooreskillup.org"
next_public_api_url  = "https://api.mooreskillup.org"
db_admin_username    = "msuadmin"
db_admin_password    = "<generate a long random one>"
django_secret_key    = "<generate a long random one>"
api_image            = ""
web_image            = ""
```

**`terraform.tfvars` holds live secrets. It is gitignored — keep it that way.**

Generate the secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

On region: `southafricanorth` is the closest Azure region to Nigeria and will
feel meaningfully faster for your students than a US region. Confirm the
services you need are available there before committing.

## 3. Create the infrastructure

```bash
cd infrastructure/terraform
terraform init
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

**Read the plan before approving it.** It should create a resource group,
registry, PostgreSQL server, storage account, Key Vault, Log Analytics, and two
container apps. It should not destroy anything.

No Terraform installed? Run it through Docker:

```bash
docker run --rm -v "$PWD:/tf" -w /tf hashicorp/terraform:latest init
```

Terraform prints the registry name and API URL when it finishes. Keep them.

## 4. Build and push the API image

```bash
ACR=<registry name from terraform output>

az acr login --name $ACR
docker build -f backend/docker/django/Dockerfile -t $ACR.azurecr.io/api:latest .
docker push $ACR.azurecr.io/api:latest
```

Then point the container app at it:

```bash
terraform apply \
  -var-file=environments/prod/terraform.tfvars \
  -var="api_image=$ACR.azurecr.io/api:latest"
```

## 5. Run migrations

Migrations run automatically on container start (`backend/docker/django/entrypoint.sh`),
so the first boot creates the schema. To run anything by hand:

```bash
az containerapp exec \
  --name api \
  --resource-group rg-mooreskillup-prod \
  --command "python manage.py createsuperuser"
```

## 6. Point Vercel at it

In your Vercel project settings, set:

```
NEXT_PUBLIC_API_URL = https://<your api url from terraform output>
```

Redeploy the frontend. Then confirm the API allows it — `cors_allowed_origins`
in `terraform.tfvars` must list your exact Vercel domain, including `https://`.

## 7. Check it works

```bash
curl https://<api-url>/api/platform/status/
```

A `200` with JSON means the API is up and talking to the database.

---

# Controlling cost

## The API costs nothing when idle

`container_apps_min_replicas` defaults to `0`, so when nobody is using the app
Azure runs no containers and you pay no compute. The first request after a quiet
spell takes **10–30 seconds** to wake — fine while you build, not fine for real
students.

**Before launch**, set it to `1` in `terraform.tfvars`:

```hcl
container_apps_min_replicas = 1
```

That costs roughly $15–30/month and removes cold starts entirely.

## The database does not

PostgreSQL bills continuously whether or not anyone queries it. Stop it while
you are away:

```bash
# Stop — no compute charges, storage still bills (~$4/mo)
az postgres flexible-server stop \
  --name <server> --resource-group rg-mooreskillup-prod

# Start again
az postgres flexible-server start \
  --name <server> --resource-group rg-mooreskillup-prod
```

**Azure restarts a stopped server automatically after 7 days.** Stopping is for
a week away, not indefinite hibernation.

## Watch the bill

Set a budget alert on day one, before anything runs:

```bash
az consumption budget create \
  --budget-name msu-monthly \
  --amount 40 \
  --time-grain Monthly \
  --category Cost
```

Then check `Cost Management + Billing` in the portal weekly for the first month.
Real usage always differs from an estimate.

## Tearing it all down

```bash
terraform destroy -var-file=environments/prod/terraform.tfvars
```

**This deletes the database and everything in it.** Take a backup first:

```bash
az postgres flexible-server backup list \
  --name <server> --resource-group rg-mooreskillup-prod
```

---

# Notes

**Running both Render and Azure.** Nothing stops you. Point
`NEXT_PUBLIC_API_URL` at whichever backend you want; the frontend neither knows
nor cares. Just make sure each backend's `cors_allowed_origins` includes your
Vercel domain, or the browser will block the calls.

**Media files.** Course banners and avatars go to Blob Storage, so they survive
container restarts. A container's own filesystem does not — anything written
there is lost on the next deploy.

**Secrets.** `terraform.tfvars` and `backend/.env` are gitignored and must stay
that way. Nothing secret has ever been committed to this repository; keep that
record intact.
