# Vercel Frontend + Docker Backend Setup

## Quick Answer

**Your Vercel frontend will NOT be affected.** The Docker setup is ONLY for local development and self-hosted backend. Vercel deployment remains separate and independent.

---

## What's Happening Now

### Current Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOCAL MACHINE                           │
│                    (docker compose up)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐  ┌────────────┐         │
│  │   Next.js    │    │   Django     │  │ PostgreSQL │         │
│  │ (localhost   ├────┤   (localhost ├──┤            │         │
│  │   :3000)     │    │   :8000)     │  │            │         │
│  └──────────────┘    └──────────────┘  └────────────┘         │
│                                                                 │
│  Redis, Database volumes all LOCAL                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (PRODUCTION)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │    Next.js App                       │                      │
│  │  (deployed from your repo)           │                      │
│  │  Makes API calls to:                 │                      │
│  │  https://yourdomain.com/api/*        │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│  Points to YOUR SELF-HOSTED BACKEND                            │
│  (Django server running on your own infrastructure)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## LOCAL DEVELOPMENT ONLY

The Docker setup you just created is **for your machine only**. 

### What Happens When You Run `docker compose up --build`

1. **Starts Next.js frontend locally** at http://localhost:3000
2. **Starts Django backend locally** at http://localhost:8000
3. **Starts PostgreSQL** locally (only accessible inside Docker)
4. **Starts Redis** locally (caching/sessions)
5. **Frontend and backend talk to each other** on localhost

**Use this for:**
- Testing frontend + backend together
- Debugging API issues
- Developing new features locally

**Does NOT affect:**
- Your Vercel deployment
- Your live website
- Your production database

---

## THREE DEPLOYMENT SCENARIOS

### Scenario 1: Local Development (RIGHT NOW)

```bash
docker compose up --build
```

**Accessible at:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

**Used by:** Only you on your machine

---

### Scenario 2: Vercel Frontend (CURRENT)

Your Next.js app is deployed on Vercel.

**What you need to do:**

Update your `next.config.mjs` and API calls to point to your backend:

```typescript
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  return response.json();
}
```

**Set Vercel environment variable:**

1. Go to your Vercel project settings
2. Environment Variables → Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-backend-domain.com` (e.g., `https://api.mooreskillup.com`)
   - **Environments:** Production, Preview, Development

**Example values:**
- **Development:** `http://localhost:8000` (local machine)
- **Preview:** `https://api-staging.mooreskillup.com`
- **Production:** `https://api.mooreskillup.com`

**Your frontend on Vercel will:**
- ✓ Deploy normally from GitHub
- ✓ Make API calls to your backend
- ✓ NOT run Docker
- ✓ NOT have a database
- ✓ Serve static/dynamic Next.js pages

---

### Scenario 3: Self-Hosted Backend (WHAT YOU'RE BUILDING)

This is what the Docker setup is for.

**You need to deploy Django + PostgreSQL + Redis somewhere:**

#### Option A: Linux VPS (DigitalOcean, Linode, AWS EC2)

```bash
# On your server:
git clone your-repo
cd your-repo
docker compose -f docker-compose.prod.yml up -d
```

Set up reverse proxy (Nginx/Caddy) to handle:
- SSL certificate
- Domain routing
- Load balancing

#### Option B: Platform-as-a-Service

- **Railway.app** (easy Docker deployment)
- **Render** (free tier available)
- **Fly.io** (simple Docker hosting)

#### Option C: AWS, GCP, Azure (Kubernetes/ECS)

More complex, for larger teams.

---

## IMPLEMENTATION CHECKLIST

### For Local Development (Do This Now)

- [x] Created `docker-compose.yml` ← Already done
- [x] Created `Dockerfile.frontend` ← Already done
- [x] Created `src/lib/api.ts` ← Already done
- [ ] **Run locally to test:** `docker compose up --build`
- [ ] Test at http://localhost:3000

### For Vercel (Do This Next)

- [ ] **Set API URL in your code:**
  ```typescript
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  ```

- [ ] **Add to Vercel environment variables:**
  - `NEXT_PUBLIC_API_URL=https://your-backend-url.com` (production)

- [ ] **Update Django CORS settings:**
  ```python
  CORS_ALLOWED_ORIGINS = [
      "http://localhost:3000",      # Local dev
      "https://yourdomain.vercel.app",  # Your Vercel domain
  ]
  ```

- [ ] **Push to GitHub and redeploy on Vercel**

### For Backend Deployment (Do This After)

Choose one platform and follow deployment guide (see below).

---

## DETAILED SETUP: VERCEL + SELF-HOSTED BACKEND

### Step 1: Update Next.js for Environment Variables

**`src/lib/api.ts`** (already created):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

**Use in your components:**

```typescript
import { apiCall } from '@/lib/api';

export default function Dashboard() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    apiCall('/api/dashboard/')
      .then(setData)
      .catch(console.error);
  }, []);

  return <div>{data && <p>{JSON.stringify(data)}</p>}</div>;
}
```

### Step 2: Configure Vercel Environment

1. **Go to:** https://vercel.com/dashboard/yourusername/mooreskillup/settings/environment-variables

2. **Add variable:**
   ```
   Name:  NEXT_PUBLIC_API_URL
   Value: http://localhost:8000
   Environments: Development ✓
   ```

   ```
   Name:  NEXT_PUBLIC_API_URL
   Value: https://api.yourdomain.com
   Environments: Preview, Production ✓
   ```

3. **Save and redeploy**

### Step 3: Configure Django CORS

**`backend/settings.py`:**

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",           # Local dev
    "http://127.0.0.1:3000",
    "https://yourdomain.vercel.app",   # Your Vercel domain
    "https://yourdomain.com",          # Custom domain (if you have one)
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "https://yourdomain.vercel.app",
    "https://yourdomain.com",
]
```

### Step 4: Test Locally First

```bash
# Terminal 1: Start Docker
docker compose up --build

# Terminal 2 (on your machine, not in container):
# Test frontend on localhost:3000
open http://localhost:3000

# Open DevTools → Network tab
# Make a request that calls the API
# You should see http://localhost:8000/api/* requests succeed
```

### Step 5: Push to GitHub

```bash
git add .
git commit -m "Add Docker setup and API client"
git push origin main
```

Vercel will auto-redeploy.

### Step 6: Test on Vercel (Before Backend Deployment)

Visit your Vercel domain: https://yourdomain.vercel.app

**Expected:** Frontend loads, but API calls fail (because backend not deployed yet).

---

## BACKEND DEPLOYMENT OPTIONS

### Option A: Railway (Recommended for Beginners)

1. **Create Railway account:** https://railway.app

2. **Connect GitHub repo**

3. **Add services:**
   - PostgreSQL (provided)
   - Django app (from Dockerfile)

4. **Set environment variables:**
   ```
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.railway.app
   DATABASE_URL=postgresql://user:pass@host:port/db
   REDIS_URL=redis://host:port
   ```

5. **Deploy** (one click)

6. **Update Vercel:**
   ```
   NEXT_PUBLIC_API_URL=https://yourdomain.railway.app
   ```

### Option B: DigitalOcean (VPS)

1. **Create droplet** (Ubuntu 22.04, $5-10/month)

2. **SSH into server:**
   ```bash
   ssh root@your-ip
   ```

3. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

4. **Clone repo:**
   ```bash
   git clone your-repo
   cd your-repo
   ```

5. **Create `.env`:**
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```

6. **Start with Docker Compose:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

7. **Set up Nginx reverse proxy** (handles SSL, domain, traffic)

---

## SUMMARY TABLE

| What | Local | Vercel | Self-Hosted Backend |
|---|---|---|---|
| **Where it runs** | Your machine | Vercel servers | Your VPS/Railway |
| **Cost** | Free | Free | $5-50/month |
| **Database** | Local Docker | None | On your server |
| **Accessible at** | localhost:3000 | yourdomain.vercel.app | api.yourdomain.com |
| **Command** | `docker compose up` | Auto from GitHub | `docker compose up -d` |
| **Frontend** | Local Next.js | Vercel hosting | Vercel hosting |
| **Backend** | Local Django | N/A | Your server |

---

## NEXT STEPS

1. **Right now:** Test locally with `docker compose up --build`
2. **Then:** Deploy backend to Railway/DigitalOcean
3. **Finally:** Update Vercel environment variable and test

Do you want help with any specific platform for backend deployment?

