# Backend Deployment Guide: Railway + Local Development

## Overview

This guide covers deploying your Django backend to Railway while maintaining local development workflow. You can build, test, and push changes locally before deploying to production.

---

## Local Development Setup

### 1. Create Backend `.env` File

Create `backend/.env` from the example (this file is `.gitignore`d):

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with local values:

```env
DJANGO_SETTINGS_MODULE=config.settings.dev
DJANGO_SECRET_KEY=your-local-dev-secret-key-change-this
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api

# Database (local Docker)
DATABASE_NAME=mooreskillup
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=db
DATABASE_PORT=5432

# CORS & Frontend
CORS_ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Email (Local Console Backend - prints to console)
DEFAULT_FROM_EMAIL=noreply@mooreskillup.com
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True

# JWT Tokens
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7

# Admin Bootstrap
ADMIN_REGISTRATION_TOKEN=your-secure-admin-token

# Payment Gateways (Test Keys)
PAYSTACK_SECRET_KEY=paystack_test_secret
PAYSTACK_PUBLIC_KEY=paystack_test_public
PAYSTACK_WEBHOOK_SECRET=paystack_webhook_secret
OPAY_SECRET_KEY=opay_test_secret
OPAY_PUBLIC_KEY=opay_test_public
OPAY_WEBHOOK_SECRET=opay_webhook_secret

# Redis (local Docker)
REDIS_URL=redis://redis:6379/0
```

### 2. Build & Run Locally with Docker Compose

Everything runs in `docker-compose.yml` (already configured):

```bash
docker compose up -d
docker compose logs -f api
```

The API will be at `http://localhost:8000`.

### 3. Run Django Commands Locally

Migrations, createsuperuser, shell:

```bash
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
docker compose exec api python manage.py shell
```

---

## Railway Deployment

### Prerequisites

1. Railway account: https://railway.app
2. GitHub repo with frontend + backend code
3. PostgreSQL addon provisioned in Railway
4. Redis addon provisioned in Railway (optional, for notifications)

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `mooreskillup` repo
4. Railway auto-detects the Dockerfile → builds from `backend/docker/django/Dockerfile`

### Step 2: Configure PostgreSQL Database

Railway provides PostgreSQL addon. Link it to your service:

1. In Railway dashboard → Add → PostgreSQL
2. Railway auto-sets environment variables:
   - `DATABASE_URL` (full connection string)
   - `DATABASE_HOST`
   - `DATABASE_PORT`
   - `DATABASE_NAME`
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`

**Note:** Your Django settings already support both `DATABASE_*` and `DB_*` variables, so no changes needed.

### Step 3: Set Environment Variables on Railway

Go to your service → Variables tab. Add these (Railway populates DB vars automatically):

```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=generate-a-strong-random-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-railway-domain.railway.app,api.mooreskillup.com

# Frontend CORS
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://mooreskillup.com
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Email: Use SendGrid, Gmail, or Mailgun
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.your-sendgrid-api-key
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@mooreskillup.com

# JWT
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7

# Admin Bootstrap
ADMIN_REGISTRATION_TOKEN=generate-secure-token

# Payments
PAYSTACK_SECRET_KEY=your-production-paystack-secret
PAYSTACK_PUBLIC_KEY=your-production-paystack-public
PAYSTACK_WEBHOOK_SECRET=your-paystack-webhook-secret
OPAY_SECRET_KEY=your-production-opay-secret
OPAY_PUBLIC_KEY=your-production-opay-public
OPAY_WEBHOOK_SECRET=your-opay-webhook-secret

# Redis (if using Railway Redis addon, it provides REDIS_URL)
REDIS_URL=redis://railway-redis-host:port
```

### Step 4: Configure Procfile for Gunicorn

Create `Procfile` in root:

```
web: cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Or Railway auto-detects and uses `CMD` from Dockerfile. Modify `backend/docker/django/Dockerfile` for production:

```dockerfile
# ... existing Dockerfile content ...

# For production: use gunicorn
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Step 5: Run Migrations on Railway

Once deployed, SSH into Railway or run one-off command:

```bash
# Via Railway CLI
railway run python manage.py migrate --noinput
railway run python manage.py createsuperuser
```

Or use Railway's "Deploy" → "Run Command" in UI.

### Step 6: Static Files & Media

For production, use WhiteNoise (already in `prod.txt`). Add to `backend/config/settings/prod.py`:

```python
# Already in prod.py, but ensure:
from .base import *

DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# WhiteNoise
MIDDLEWARE = [
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Add at top
] + MIDDLEWARE

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```

Collect static files during build:

Add to entrypoint or run before server start:

```bash
python manage.py collectstatic --noinput
```

### Step 7: Generate Production Secret Key

Use Django's built-in:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and paste into Railway's `DJANGO_SECRET_KEY` variable.

---

## Email Configuration

### For Local Development

Set `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`. Emails print to console.

### For Production (Railway)

**Option A: SendGrid (Recommended)**

1. Sign up at https://sendgrid.com
2. Get API key
3. Set on Railway:
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_HOST_USER=apikey
   EMAIL_HOST_PASSWORD=SG.your-api-key
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```

**Option B: Gmail**

1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Set on Railway:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```

**Option C: Mailgun**

1. Sign up at https://mailgun.com
2. Get SMTP credentials
3. Set on Railway similarly

---

## Password Reset Email Flow

When user requests password reset:

1. Django creates `PasswordResetToken` with expiry
2. Sends email via configured `EMAIL_BACKEND` with reset link
3. Link format: `{FRONTEND_URL}/auth/reset-password?token={token}`
4. Frontend calls backend to verify + reset password

**Local Testing:**
- Emails print to `docker compose logs api`
- Copy token from console, test manually

**Production (Railway):**
- Real emails sent via SendGrid/Gmail/Mailgun
- Monitor email delivery in provider dashboard

---

## Workflow: Local Build → Push → Deploy

### 1. Local Development

```bash
# Make changes
cd backend
# Run tests
docker compose exec api pytest

# Start dev server
docker compose up -d

# Test API endpoints
curl http://localhost:8000/api/auth/login
```

### 2. Commit & Push

```bash
# Only commit backend changes (not compose file)
git add backend/
git commit -m "Feature: add password reset email"
git push origin main
```

### 3. Deploy to Railway

Once pushed to GitHub:

1. Go to Railway dashboard
2. Your service auto-redeploys (if auto-deploy enabled)
3. Monitor logs: `railway logs`
4. Verify: `curl https://your-railway-domain/api/auth/login`

### 4. Run Production Migrations

```bash
railway run python manage.py migrate
```

---

## Environment Variables Checklist

### Local (`backend/.env`)
- [ ] `DJANGO_SETTINGS_MODULE=config.settings.dev`
- [ ] `DJANGO_SECRET_KEY` (dev key, can be simple)
- [ ] `DJANGO_DEBUG=True`
- [ ] Database: `DATABASE_HOST=db` (Docker network)
- [ ] `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
- [ ] `CORS_ALLOWED_ORIGINS=http://localhost:3000`
- [ ] `PAYSTACK_SECRET_KEY` (test key)
- [ ] `OPAY_SECRET_KEY` (test key)

### Production (Railway Variables)
- [ ] `DJANGO_SETTINGS_MODULE=config.settings.prod`
- [ ] `DJANGO_SECRET_KEY` (strong random key)
- [ ] `DJANGO_DEBUG=False`
- [ ] Database: auto-set by Railway PostgreSQL addon
- [ ] `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- [ ] `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` (SendGrid/Gmail/Mailgun)
- [ ] `CORS_ALLOWED_ORIGINS` (production frontend domains)
- [ ] `DJANGO_ALLOWED_HOSTS` (Railway domain + custom domains)
- [ ] `PAYSTACK_SECRET_KEY` (production key)
- [ ] `OPAY_SECRET_KEY` (production key)

---

## Troubleshooting

### Database Connection Failed on Railway

1. Verify PostgreSQL addon is linked to service
2. Check `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` are set
3. Ensure firewall allows Railway's IP

```bash
railway logs  # Check for DB connection errors
```

### Migrations Fail

```bash
railway run python manage.py migrate --noinput -v 2
```

### Static Files Not Loading

Verify `STATIC_ROOT` is set and `collectstatic` runs:

```bash
railway run python manage.py collectstatic --noinput -v 2
```

### Email Not Sending

Check `EMAIL_BACKEND` is `smtp.EmailBackend`, credentials are correct:

```bash
railway run python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])
```

### CORS Errors

Ensure `CORS_ALLOWED_ORIGINS` includes your frontend domain (with protocol):

```
https://your-frontend.vercel.app
```

---

## Next Steps

1. Create `.env` file locally with values above
2. Test locally with `docker compose up`
3. Set up Railway project and PostgreSQL addon
4. Configure environment variables on Railway
5. Deploy by pushing to GitHub
6. Run migrations: `railway run python manage.py migrate`
7. Monitor: `railway logs -f`

---

## References

- Django Deployment: https://docs.djangoproject.com/en/5.1/howto/deployment/
- Railway Docs: https://docs.railway.app/
- Email Configuration: https://docs.djangoproject.com/en/5.1/topics/email/
