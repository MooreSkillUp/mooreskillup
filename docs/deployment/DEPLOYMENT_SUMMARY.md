# Backend Deployment Summary

## What You Need to Know

Your backend is a Django REST API that needs:

### Local Development
1. PostgreSQL database (in Docker)
2. Redis for caching/tasks (in Docker)
3. `.env` file with credentials

### Production (Railway)
1. PostgreSQL addon (Railway provides)
2. Redis addon (optional)
3. Environment variables on Railway dashboard
4. Email service (SendGrid/Gmail/Mailgun)

---

## Files Created/Updated

### New Files
- **`BACKEND_RAILWAY_DEPLOYMENT.md`** - Full deployment guide
- **`backend/.env.railway`** - Railway env vars template
- **`Procfile`** - Railway deployment script
- **`backend/config/settings/prod.py`** - Updated with security + WhiteNoise

### Updated Files
- **`backend/docker/django/Dockerfile`** - Now uses gunicorn in production
- **`backend/docker/django/entrypoint.sh`** - Collects static files + chooses server

---

## Quick Start: 3 Steps

### Step 1: Local Setup
```bash
# Create .env from example
cp backend/.env.example backend/.env

# Start everything
docker compose up -d

# Verify
curl http://localhost:8000/api/auth/login
```

### Step 2: Push to GitHub
```bash
git add backend/
git commit -m "Deployment: add Gunicorn, WhiteNoise, production settings"
git push
```

### Step 3: Deploy to Railway
1. Go to https://railway.app
2. Create project → Deploy from GitHub
3. Add PostgreSQL addon
4. Set environment variables (copy from `backend/.env.railway`)
5. Click Deploy

---

## Environment Variables You Must Set

### Local (`backend/.env`)
```
DJANGO_SETTINGS_MODULE=config.settings.dev
DJANGO_DEBUG=True
DATABASE_HOST=db
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Production (Railway)
```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_DEBUG=False
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net (or gmail/mailgun)
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.your-key
```

See `backend/.env.railway` for full template.

---

## Email for Password Reset

### Local
- Emails print to console: `docker compose logs api`
- Copy reset token from logs and test manually

### Production
- Use SendGrid (recommended), Gmail, or Mailgun
- Users receive real password reset emails
- Configure `EMAIL_*` variables on Railway

---

## Commands to Run on Railway

```bash
# After first deploy, run migrations
railway run python manage.py migrate

# Create admin user
railway run python manage.py createsuperuser

# View logs
railway logs -f
```

---

## Workflow: Code → Push → Deploy

1. **Edit code locally** in `backend/`
2. **Test locally** with `docker compose up`
3. **Run tests** with `docker compose exec api pytest`
4. **Commit & push** to GitHub
5. **Railway auto-deploys** (if auto-deploy enabled)
6. **Monitor** with `railway logs`

---

## What Happens on Deploy

1. Railway detects `Procfile` or Dockerfile
2. Builds Docker image (installs dependencies)
3. Runs `release:` command (migrations)
4. Starts `web:` service (gunicorn)
5. Collects static files (WhiteNoise)
6. API live at `https://your-railway-domain.railway.app`

---

## Next Actions

✅ Review `BACKEND_RAILWAY_DEPLOYMENT.md` for details
✅ Create `backend/.env` from `.env.example`
✅ Test locally with `docker compose up`
✅ Commit these changes
✅ Create Railway project
✅ Set environment variables on Railway
✅ Deploy and run migrations
✅ Configure email service (SendGrid/Gmail)

---

## Need Help?

- Django docs: https://docs.djangoproject.com/en/5.1/
- Railway docs: https://docs.railway.app/
- Django email: https://docs.djangoproject.com/en/5.1/topics/email/
