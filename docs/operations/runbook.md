# Operations Runbook

## Common tasks

- Check app health
- Review logs and traces
- Restart services
- Re-run migrations
- Revoke sessions
- Rotate secrets

## Incident checklist

1. Confirm scope
2. Check alerts
3. Identify affected service
4. Roll back if needed
5. Communicate status
6. Capture root cause

## Recovery priorities

- Auth and login
- Payments
- Course access
- Notifications
- Reporting and analytics

## Backups and restoring

### What is protected, and for how long

| What | How it is protected | Window |
| --- | --- | --- |
| The database | Azure point-in-time restore: a daily full backup plus a continuous log of every change, so any minute inside the window can be restored | 14 days |
| Uploaded files (course banners, avatars, certificate PDFs) | Blob soft delete on the storage account: a deleted or overwritten file can be undeleted | 14 days |
| Infrastructure | Terraform in this repository | Git history |

Backup storage is included up to the database's provisioned size (32 GB). The
data is far smaller, so the 14-day window costs nothing today. Raise
`backup_retention_days` in `infrastructure/terraform/modules/postgres/main.tf`
when the database grows or the risk changes.

### Check it is working (once a month, 2 minutes)

Azure portal, the `mooreskillup-prod-*` Postgres server, **Backup and restore**.
The **earliest restore point** should be about 14 days ago. If it is not, the
retention change has not been applied — check the last Terraform apply.

### Restore the database to a point in time

A restore never touches the live server: Azure creates a **new** server from the
chosen moment, which is then checked before anything is switched over.

1. Write down the time to restore to, in UTC, just before the damage.
2. Azure portal, the Postgres server, **Restore**. Choose the point in time and
   a new server name, for example `mooreskillup-prod-db-restore-<date>`.
3. Wait for it to finish, usually 10 to 30 minutes.
4. Connect to the new server and confirm the data is there:
   `psql "host=<new-server>.postgres.database.azure.com user=<admin> dbname=mooreskillup sslmode=require"`,
   then check the rows that matter, for example `select count(*) from accounts_user;`
5. To switch to it, point `POSTGRES_HOST` at the new server and redeploy. The
   environment variable only reaches the container on a deploy.
6. Delete the restored server once it is no longer needed. It bills like any
   other server.

### Undelete a file

Azure portal, the storage account, **Containers**, pick the container, switch on
**Show deleted blobs**, select the file, **Undelete**.

### Restore drill

Do a real restore every 3 months, and after any major change to the database.
Restore, confirm the row counts, delete the restored server. A backup that has
never been restored is not yet a backup.

## Health and monitoring

- `GET /api/health/` answers `200` with `{"status": "ok"}` while the API and its
  database are both answering, and `503` when the database cannot be reached. It
  is public, unthrottled and says nothing else, so an outside monitor can call it
  every few minutes.
- The API scales to zero while idle, so each check wakes it. Until the minimum
  replica count is 1, keep the monitor at 30-minute intervals; at 5 minutes the
  app is effectively always on and costs as much as setting the minimum to 1.

