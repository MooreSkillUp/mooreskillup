# Backend Deployment Checklist

## ✅ Pre-Deployment (Local)

- [x] Backend structure verified
- [x] Django settings configured (dev + prod)
- [x] PostgreSQL + Redis set up in Docker
- [x] Email backend configured (console for dev, SMTP for prod)
- [x] API running and responding at `http://localhost:8000`
- [x] Database migrations applied
- [x] Gunicorn + WhiteNoise added for production
- [x] Static files collection enabled
- [x] Procfile created for Railway

## ✅ Files Updated for Production

| File | Change |
|------|--------|
| `backend/config/settings/prod.py` | Added WhiteNoise, HTTPS redirect, HSTS security |
| `backend/docker/django/Dockerfile` | Uses gunicorn in production, dev server in dev |
| `backend/docker/django/entrypoint.sh` | Collects static files + chooses correct server |
| `Procfile` | Railway deployment script (migrations + server) |
| `backend/.env.railway` | Template with all production env vars |

## 📋 Local Development Workflow

```bash
# 1. Create .env from example
cp backend/.env.example backend/.env

# 2. Edit backend/.env (set EMAIL_BACKEND to console for local testing)
# EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# 3. Start everything
docker compose up -d

# 4. Run commands
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
docker compose exec api python manage.py shell

# 5. Make changes, commit, push
git add backend/
git commit -m "feature: description"
git push origin main
```

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Project
1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `mooreskillup` repository
4. Railway auto-detects Dockerfile

### Step 2: Add PostgreSQL
1. In Railway dashboard → "Add" → Select "PostgreSQL"
2. Link to your service
3. Railway auto-provides `DATABASE_*` variables

### Step 3: Add Redis (Optional)
1. Click "Add" → Select "Redis"
2. Link to service
3. Railway auto-provides `REDIS_URL`

### Step 4: Set Environment Variables
Go to your service → "Variables" tab and add:

**Core Django**
```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<generate-random-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-railway-domain.railway.app,api.mooreskillup.com
```

**Frontend CORS**
```
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://mooreskillup.com
FRONTEND_URL=https://your-frontend.vercel.app
```

**Email (SendGrid recommended)**
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.your-sendgrid-api-key
EMAIL_PORT=587
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@mooreskillup.com
```

**JWT Tokens**
```
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
```

**Admin Bootstrap**
```
ADMIN_REGISTRATION_TOKEN=<generate-secure-token>
```

**Payments (Use Production Keys)**
```
PAYSTACK_SECRET_KEY=sk_live_your_key
PAYSTACK_PUBLIC_KEY=pk_live_your_key
PAYSTACK_WEBHOOK_SECRET=webhook_secret
OPAY_SECRET_KEY=opay_prod_secret
OPAY_PUBLIC_KEY=opay_prod_public
OPAY_WEBHOOK_SECRET=opay_prod_webhook
```

### Step 5: Deploy
1. Railway auto-deploys when you push to GitHub (if auto-deploy enabled)
2. Or manually click "Deploy"
3. Monitor logs: Railway dashboard → "Logs" tab

### Step 6: Run Initial Commands
```bash
# Via Railway CLI:
railway login
railway link  # Select your project
railway run python manage.py migrate --noinput
railway run python manage.py createsuperuser
railway run python manage.py collectstatic --noinput
```

Or use Railway dashboard "Deploy" → "Run Command"

## 🔧 Generate Required Keys

### Django Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Admin Registration Token
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 📧 Email Configuration

### For Local Development
Email backend is `console.EmailBackend` by default in `.env.example`  
→ All emails print to `docker compose logs api`

### For Production (Railway)

**Option 1: SendGrid (Recommended)**
1. Sign up: https://sendgrid.com
2. Create API key
3. Set on Railway:
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_HOST_USER=apikey
   EMAIL_HOST_PASSWORD=SG.your-api-key
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```

**Option 2: Gmail**
1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Set on Railway:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```

**Option 3: Mailgun**
1. Sign up: https://mailgun.com
2. Get SMTP credentials from dashboard
3. Set similarly on Railway

## 🧪 Test After Deployment

```bash
# Test API is live
curl https://your-railway-domain.railway.app/api/auth/login

# Test database connection
railway run python manage.py dbshell
SELECT 1;
\q

# Test migrations
railway logs -f | grep "Running migrations"

# Test email (Django shell)
railway run python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test body', 'from@example.com', ['to@example.com'])
>>> exit()
```

## 🐛 Troubleshooting

### Database Connection Failed
```bash
railway logs -f
# Look for "ERROR: connection refused"
# Verify DATABASE_* variables are set in Railway dashboard
# Ensure PostgreSQL addon is linked to service
```

### Migrations Fail
```bash
railway run python manage.py migrate --noinput -v 2
# Check for schema errors or missing tables
```

### Static Files Not Loading
```bash
railway run python manage.py collectstatic --noinput -v 2
# Verify STATIC_ROOT is writable
# Check WhiteNoise middleware is enabled in prod.py
```

### Email Not Sending
```bash
# Test credentials in Django shell
railway run python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])
>>> # Check for exceptions
```

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes frontend domain with https://
- Verify frontend sends requests to correct API domain

### 401 Unauthorized Errors
- Ensure JWT tokens are being sent: `Authorization: Bearer <token>`
- Check JWT_ACCESS_MINUTES and JWT_REFRESH_DAYS are set
- Verify admin user was created with `railway run python manage.py createsuperuser`

## 📚 Quick Reference

| Environment | Setting |
|---|---|
| Local Dev | `DJANGO_DEBUG=True`, PostgreSQL in Docker, Email to console |
| Production | `DJANGO_DEBUG=False`, Railway PostgreSQL, Email via SMTP |

## 🔐 Security Reminders

- ✅ `DJANGO_SECRET_KEY` is random and strong
- ✅ `DJANGO_DEBUG=False` in production
- ✅ `ALLOWED_HOSTS` includes only your domains
- ✅ HTTPS redirect enabled (`SECURE_SSL_REDIRECT=True`)
- ✅ HSTS enabled (`SECURE_HSTS_SECONDS=31536000`)
- ✅ Cookies are secure (`SESSION_COOKIE_SECURE=True`)
- ✅ Email credentials are environment variables, not hardcoded
- ✅ `.env` file is gitignored (not pushed to GitHub)

## 📖 Documentation References

- Full guide: `BACKEND_RAILWAY_DEPLOYMENT.md`
- Summary: `DEPLOYMENT_SUMMARY.md`
- Django docs: https://docs.djangoproject.com/en/5.1/
- Railway docs: https://docs.railway.app/
- Email setup: https://docs.djangoproject.com/en/5.1/topics/email/
