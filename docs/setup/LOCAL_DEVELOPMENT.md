# Local Development Guide

This guide explains how to run your frontend and backend locally during development, and how Docker Compose setup integrates with Vercel deployments.

## Running Everything with Docker Compose

The easiest way to run the entire stack locally is with Docker Compose:

```bash
docker compose up --build
```

This starts:
- **Frontend** (Next.js): http://localhost:3000
- **Backend** (Django): http://localhost:8000
- **Database** (PostgreSQL): localhost:5432
- **Cache** (Redis): localhost:6379

Services automatically restart on file changes thanks to the `develop.watch` configuration.

### Stop All Services

```bash
docker compose down
```

Remove volumes too (clears database):
```bash
docker compose down -v
```

---

## Running Frontend Locally Only

If you want to run Next.js locally without Docker:

### Prerequisites
- Node.js 20+ or Bun installed
- Backend running (Docker or locally)

### With npm

```bash
npm install
npm run dev
```

### With Bun (recommended)

```bash
bun install
bun run dev
```

Frontend runs at http://localhost:3000

**Environment variables:** Frontend automatically picks up from `.env.local` or `.env.development.local`. Set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://localhost:8000
```

---

## Running Backend Locally Only

If you want to run Django locally without Docker:

### Prerequisites
- Python 3.12+
- PostgreSQL 16 running
- Redis 7 running (or use Docker for just db/redis)

### Setup

```bash
cd backend
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements/dev.txt
```

### Configure Environment

Copy `.env.example` to `.env` and update:
```
DEBUG=True
DATABASE_URL=postgresql://moore_user:moore_password@localhost:5432/mooreskillup
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Run Migrations

```bash
python manage.py migrate
```

### Start Backend

```bash
python manage.py runserver
```

Backend runs at http://localhost:8000

---

## Hybrid Setup: Local Frontend + Dockerized Backend

Run frontend locally for faster iteration, backend in Docker:

```bash
# Terminal 1: Start backend, db, redis
docker compose up db redis api

# Terminal 2: Run frontend locally
npm run dev
# or
bun run dev
```

Frontend at http://localhost:3000, connects to http://localhost:8000 (Docker backend).

---

## Vercel Deployments (Not Affected)

Your Docker Compose setup **does NOT affect Vercel deployments**. Here's why:

### Vercel Only Deploys Frontend

Vercel automatically detects and deploys your Next.js frontend. It:
1. Ignores `docker-compose.yml` and `Dockerfile.frontend`
2. Installs dependencies via `npm ci` or `bun install`
3. Runs build script from `package.json`
4. Deploys optimized Next.js output

### Backend API Integration

Your frontend code calls the backend via the `NEXT_PUBLIC_API_URL` environment variable:

```javascript
// This is used in the browser
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api.example.com';
```

**On Vercel:**
- Set `NEXT_PUBLIC_API_URL` to your production backend URL in project settings
- Example: `https://api.mooreskillup.com` or `https://your-backend-domain.com`

**Locally:**
- `.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Docker Compose sets it via `docker-compose.yml`

### Key Files for Vercel

Vercel only needs:
- `package.json` (dependencies and build scripts)
- `src/` (Next.js app)
- `public/` (static assets)
- `.env` or project env vars (configured in Vercel dashboard)

Files Vercel ignores:
- `docker-compose.yml`
- `Dockerfile.frontend`
- `.dockerignore`
- `backend/` (Python code)

---

## Hot Reload During Development

### Docker Compose (Automatic)

The `develop.watch` section in `docker-compose.yml` syncs files automatically:

```yaml
develop:
  watch:
    - path: ./src
      action: sync
      target: /app/src
    - path: ./public
      action: sync
      target: /app/public
    - path: ./package.json
      action: rebuild  # Rebuilds on dependency changes
```

Save a file in `src/` or `public/`, and Next.js hot-reloads instantly.

### Local Frontend (Manual)

If running `bun run dev` locally, Next.js watches files automatically. No extra setup needed.

---

## Troubleshooting

### "Cannot connect to backend"

**Local frontend + Docker backend:**
- Make sure backend is running: `docker compose up api`
- Check `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Verify port 8000 is open: `curl http://localhost:8000/admin/`

**Both local:**
- Ensure backend is running: `python manage.py runserver`
- Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### "Port already in use"

If port 3000 or 8000 is taken:

**Docker Compose:** Edit `docker-compose.yml`:
```yaml
services:
  web:
    ports:
      - "3001:3000"  # Use 3001 instead
```

**Local backend:** Run on different port:
```bash
python manage.py runserver 8001
# Update frontend .env.local: NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Database errors

Reset everything:
```bash
docker compose down -v  # Removes volumes
docker compose up --build
```

---

## Summary

| Scenario | Command | Notes |
|----------|---------|-------|
| **Everything (easiest)** | `docker compose up --build` | Frontend + backend + db + redis |
| **Frontend only (local)** | `bun run dev` | Requires backend running somewhere |
| **Backend only (local)** | `python manage.py runserver` | Requires PostgreSQL + Redis running |
| **Frontend local + Backend Docker** | `docker compose up db redis api` + `bun run dev` | Best for rapid frontend iteration |
| **Vercel deployment** | `git push` | Automatic, no Docker involved |

Your Vercel deployments work independently. Docker Compose is only for local development.
