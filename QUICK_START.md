# Complete Local Testing & Vercel Deployment Workflow

## What's Happening Right Now

```
YOUR MACHINE                          VERCEL                        YOUR BACKEND SERVER
┌──────────────────┐                ┌──────────────┐               ┌─────────────────┐
│  Next.js (3000)  │                │  Next.js     │               │  Django (8000)  │
│  Django (8000)   │                │  Hosted      │               │  PostgreSQL     │
│  PostgreSQL      │ ←LOCAL ONLY→   │  Free Tier   │ ←API CALLS→   │  Redis          │
│  Redis           │                │              │               │  Hosted (paid)  │
│                  │                │              │               │                 │
│ docker compose   │                │ Auto deploy  │               │ Your VPS/       │
│    up --build    │                │  from GitHub │               │ Platform        │
└──────────────────┘                └──────────────┘               └─────────────────┘
      ^                                    ^                              ^
      |                                    |                              |
  Only you                         Your users visit              Where data lives
  Testing                          this URL                      and processes run
```

---

## Timeline

### Phase 1: Local Testing (NOW)

```bash
docker compose up --build
```

**What it does:**
- Starts Next.js at http://localhost:3000
- Starts Django at http://localhost:8000
- Starts PostgreSQL inside Docker
- Frontend and backend talk to each other locally

**Duration:** Until you're satisfied with local testing

---

### Phase 2: Deploy Backend (NEXT)

Once local testing works, deploy Django + PostgreSQL to:
- **Railway** (easiest)
- **DigitalOcean** (cheapest)
- **Render** (good middle ground)

At this point:
- Your backend is live at `https://api.yourdomain.com`
- Vercel frontend still exists separately
- They're not connected yet

---

### Phase 3: Connect Vercel to Backend (FINAL)

Update Vercel environment variables:
```
NEXT_PUBLIC_API_URL = https://api.yourdomain.com
```

Now:
- Users visit https://yourdomain.vercel.app
- Frontend makes API calls to https://api.yourdomain.com
- Everything works!

---

## Step-by-Step: Local Testing

### Step 1: Ensure Docker is Running

```bash
docker --version
docker compose --version
```

### Step 2: Start Docker Compose

```bash
cd your-project-root
docker compose up --build
```

**Wait for output like:**
```
mooreskillup-web-1 | ▲ Next.js 15.0.0
mooreskillup-api-1 | Starting development server at 0.0.0.0:8000
mooreskillup-db-1  | database system is ready to accept connections
```

### Step 3: Test Frontend

Open http://localhost:3000 in your browser.

**Expected:** Next.js app loads, no errors in console (F12)

### Step 4: Test Backend

Open http://localhost:8000/admin in your browser.

**Expected:** Django admin login page appears

### Step 5: Test API Communication

In browser console (F12):

```javascript
fetch('http://localhost:8000/api/your-endpoint/')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected:** Data appears in console, OR you see error message (check CORS settings)

### Step 6: Test Database

```bash
docker compose exec db psql -U moore_user -d mooreskillup
```

```sql
\dt
SELECT * FROM django_migrations LIMIT 5;
\q
```

**Expected:** See database tables

### Step 7: Check Logs

```bash
# All logs
docker compose logs -f

# Just backend
docker compose logs -f api

# Just frontend
docker compose logs -f web
```

---

## Step-by-Step: Backend Deployment

### Option A: Railway (Recommended)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Choose your repo
5. Select `Dockerfile` option
6. Railway auto-deploys

**Get your backend URL:**
- Check Railway dashboard → Deployments
- Your backend is at: `https://yourdomain-railway.app`

### Option B: DigitalOcean

1. Create a droplet ($5/month)
2. SSH into it
3. Copy your repo
4. Run: `docker compose -f docker-compose.prod.yml up -d`
5. Set up Nginx reverse proxy
6. Backend URL: `https://your-ip-or-domain.com`

---

## Step-by-Step: Connect Vercel to Backend

### Step 1: Update Vercel Environment

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://api.yourdomain.com` (or Railway URL)
   - **Environments:** Production, Preview

### Step 2: Redeploy on Vercel

```bash
git add .
git commit -m "Update API URL for production"
git push origin main
```

Vercel auto-redeploys.

### Step 3: Test

Visit your Vercel domain and open DevTools → Network.

**Expected:**
- Frontend loads
- API requests go to `https://api.yourdomain.com/api/*`
- Responses are 200 OK

---

## Troubleshooting

### Local: Frontend can't reach backend

**Symptom:** `fetch failed`, `Connection refused`

**Fix:**
```bash
# Check if backend is running
docker compose ps api

# Check backend logs
docker compose logs api

# Make sure CORS is configured
docker compose restart api
```

### Vercel: API calls return 403/404

**Symptom:** Frontend loads but API calls fail

**Fix:**
1. Update `NEXT_PUBLIC_API_URL` in Vercel
2. Restart Django with updated CORS settings
3. Verify backend is deployed and accessible

### Backend: Database migration errors

**Symptom:** `no such table: auth_user`

**Fix:**
```bash
docker compose exec api python manage.py migrate
```

---

## Quick Reference Commands

```bash
# LOCAL TESTING
docker compose up --build        # Start everything
docker compose logs -f           # Watch logs
docker compose exec api bash     # Shell into backend
docker compose exec web bash     # Shell into frontend
docker compose down              # Stop everything

# BACKEND (PRODUCTION)
docker compose -f docker-compose.prod.yml up -d    # Start (background)
docker compose -f docker-compose.prod.yml logs     # View logs
docker compose -f docker-compose.prod.yml ps       # Status

# TESTING
curl http://localhost:8000/admin/
curl http://localhost:3000/
```

---

## Summary

| Phase | Duration | What Happens | Where |
|---|---|---|---|
| **Phase 1** | Now → When ready | Test locally | Your machine |
| **Phase 2** | 1 hour | Deploy backend | Railway/DigitalOcean |
| **Phase 3** | 10 minutes | Connect Vercel | Vercel settings |

After all 3 phases, your production setup is complete:
- ✓ Frontend on Vercel
- ✓ Backend on your server
- ✓ Database on your server
- ✓ Everything connected

