# Environment Variables Setup

## Local Development (`.env` files)

### Frontend (.env.local)

```env
# .env.local (Git ignored, not needed for Vercel)
# This is only for LOCAL development

NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (backend/.env)

```env
# backend/.env (Git ignored)
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,api
DATABASE_URL=postgresql://moore_user:moore_password@db:5432/mooreskillup
REDIS_URL=redis://redis:6379/0
```

---

## Production Setup

### Vercel Environment Variables

Set these in Vercel dashboard: **Settings → Environment Variables**

**Development:**
```
NEXT_PUBLIC_API_URL = http://localhost:8000
```

**Preview & Production:**
```
NEXT_PUBLIC_API_URL = https://api.yourdomain.com
```

(Replace `api.yourdomain.com` with your actual backend domain)

---

### Backend Server Environment Variables

When deploying backend to Railway, DigitalOcean, or similar:

```env
# backend/.env (on your server)

DEBUG=False
SECRET_KEY=generate-a-long-random-string-here

# Database
DATABASE_URL=postgresql://moore_user:YOUR_PASSWORD@db:5432/mooreskillup

# Redis
REDIS_URL=redis://redis:6379/0

# Allowed hosts (Django)
ALLOWED_HOSTS=api.yourdomain.com,your-server-ip,yourdomain.com

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.vercel.app,https://yourdomain.com

# Email (if used)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AWS S3 (if used for file storage)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
```

---

## How to Generate SECRET_KEY

```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Or online: https://djecrety.ir/

---

## Environment Variable Reference

| Variable | Local | Vercel | Backend Server |
|---|---|---|---|
| `DEBUG` | True | N/A | False |
| `SECRET_KEY` | dev-key | N/A | Random, long |
| `NEXT_PUBLIC_API_URL` | http://localhost:8000 | https://api.yourdomain.com | N/A |
| `DATABASE_URL` | postgres://... @ db:5432 | N/A | postgres://... @ host:5432 |
| `REDIS_URL` | redis://redis:6379 | N/A | redis://redis:6379 |
| `ALLOWED_HOSTS` | localhost,127.0.0.1 | N/A | yourdomain.com,api.yourdomain.com |

