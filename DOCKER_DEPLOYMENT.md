# Docker Deployment Guide - Monorepo (Frontend + Backend)

This guide covers deploying your monorepo with Next.js frontend and Django backend using Docker, testing locally, and connecting services.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development](#local-development)
3. [Testing Locally](#testing-locally)
4. [Production Deployment](#production-deployment)
5. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Docker Compose Network                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐  ┌────────────┐ │
│  │   Frontend   │    │   Backend    │  │ PostgreSQL │ │
│  │  (Next.js)   ├────┤   (Django)   ├──┤  (Port     │ │
│  │  Port 3000   │    │  Port 8000   │  │   5432)    │ │
│  └──────────────┘    └──────────────┘  └────────────┘ │
│                             │                          │
│                             └────────────────┐         │
│                                              │         │
│                                         ┌────────────┐ │
│                                         │   Redis    │ │
│                                         │ (Port 6379)│ │
│                                         └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Services:**
- **Frontend (Next.js)**: Runs on `http://localhost:3000`
- **Backend (Django)**: Runs on `http://localhost:8000`
- **PostgreSQL**: Database (port 5432, only accessible within Docker network)
- **Redis**: Caching/Sessions (port 6379, only accessible within Docker network)

---

## Local Development

### Prerequisites

- Docker Desktop installed and running
- Git

### Step 1: Update `docker-compose.yml`

Your current compose file only has the backend. Add the frontend service:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: mooreskillup
      POSTGRES_USER: moore_user
      POSTGRES_PASSWORD: moore_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moore_user"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: backend/docker/django/Dockerfile
    env_file:
      - backend/.env
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - ALLOWED_HOSTS=localhost,127.0.0.1,api

  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - API_URL=http://api:8000
    depends_on:
      - api
    volumes:
      - ./src:/app/src
      - ./public:/app/public

volumes:
  postgres_data:
  redis_data:
```

### Step 2: Create Frontend Dockerfile

Create `Dockerfile.frontend` in your project root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY next.config.mjs tsconfig.json components.json ./
COPY postcss.config.js tailwind.config.js ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### Step 3: Configure Backend API URL

Update your Next.js API calls to use the environment variable.

**Create `src/lib/api.ts`** (if not already present):

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

**In your components**, use:

```typescript
import { apiCall } from '@/lib/api';

export async function fetchData() {
  return apiCall('/api/endpoint/');
}
```

### Step 4: Configure Django CORS

Update `backend/settings.py` to allow requests from the frontend:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://web:3000",  # For Docker network
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://web:3000",
]
```

### Step 5: Start Local Development

```bash
# Build and start all services
docker compose up --build

# Or in detached mode (background)
docker compose up -d --build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f web
```

**Access the services:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Backend admin: http://localhost:8000/admin/

---

## Testing Locally

### Test 1: Verify Services are Running

```bash
# Check running containers
docker compose ps

# Output should show:
# NAME                COMMAND                  SERVICE      STATUS
# mooreskillup-db-1   "docker-entrypoint..."   db           Up (healthy)
# mooreskillup-redis-1 "redis-server"           redis        Up
# mooreskillup-api-1  "/app/docker/django/..."  api          Up
# mooreskillup-web-1  "npm run dev"            web          Up
```

### Test 2: Test Backend API

```bash
# Test Django admin endpoint
curl http://localhost:8000/admin/

# Test a specific API endpoint (replace with your actual endpoint)
curl -X GET http://localhost:8000/api/your-endpoint/ \
  -H "Content-Type: application/json"
```

### Test 3: Test Frontend-Backend Communication

In your browser, open **DevTools → Network tab** and navigate to http://localhost:3000.

You should see:
1. Fetch requests to `http://localhost:8000/api/*` from the frontend
2. Status 200 responses (or appropriate status codes)
3. No CORS errors in the console

**If you see CORS errors:**
- Update `CORS_ALLOWED_ORIGINS` in `backend/settings.py`
- Restart the backend: `docker compose restart api`

### Test 4: Test Database Connection

```bash
# Connect to PostgreSQL inside the container
docker compose exec db psql -U moore_user -d mooreskillup

# List tables
\dt

# Exit
\q
```

### Test 5: Check Service Logs for Errors

```bash
# Frontend logs
docker compose logs web

# Backend logs
docker compose logs api

# Database logs
docker compose logs db

# Redis logs
docker compose logs redis
```

### Test 6: Run Backend Tests

```bash
# Run pytest inside the API container
docker compose exec api pytest

# Run with coverage
docker compose exec api pytest --cov=backend
```

---

## Production Deployment

### Option A: Docker Compose (Single Server)

**⚠️ Note:** Docker Compose is suitable for single-host deployments only. For multi-server setups, use Kubernetes or Docker Swarm.

#### Deployment Steps:

1. **Clone repository on production server:**
   ```bash
   git clone https://github.com/yourusername/mooreskillup.git
   cd mooreskillup
   ```

2. **Create `.env` file:**
   ```bash
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with production values
   nano backend/.env
   ```

3. **Update `docker-compose.yml` for production:**

```yaml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_DB: mooreskillup
      POSTGRES_USER: moore_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Use env variable
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moore_user"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7
    restart: always
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: backend/docker/django/Dockerfile
    restart: always
    env_file:
      - backend/.env
    environment:
      - DEBUG=False
      - ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "8000:8000"

  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    environment:
      - NEXT_PUBLIC_API_URL=https://yourdomain.com/api
      - API_URL=http://api:8000
    depends_on:
      - api
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
```

4. **Build and start services:**
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

5. **Set up reverse proxy (Nginx/Caddy)** to route traffic to ports 3000 and 8000, handle SSL, and manage subdomains.

### Option B: Kubernetes

For multi-server, high-availability setups, see [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md).

---

## Environment Variables

### Backend (Django)

**`backend/.env`:**
```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
DATABASE_URL=postgresql://moore_user:password@db:5432/mooreskillup
REDIS_URL=redis://redis:6379/0
```

### Frontend (Next.js)

**`docker-compose.yml` environment section:**
```yaml
NEXT_PUBLIC_API_URL=http://localhost:8000  # Public (browser)
API_URL=http://api:8000                    # Internal (Node.js)
```

---

## Troubleshooting

### Issue: Frontend cannot reach backend

**Symptoms:** `fetch failed`, `Connection refused`, CORS errors

**Solutions:**

1. **Check if backend is running:**
   ```bash
   docker compose ps api
   docker compose logs api
   ```

2. **Update CORS settings in Django:**
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://web:3000",  # Docker network name
   ]
   ```

3. **Restart backend:**
   ```bash
   docker compose restart api
   ```

4. **Check API URL in frontend:**
   - Browser: Should be `http://localhost:8000` (public)
   - Inside container: Should be `http://api:8000` (Docker network)

### Issue: Database connection error

**Symptoms:** `FATAL: Ident authentication failed`

**Solutions:**

1. **Check DB logs:**
   ```bash
   docker compose logs db
   ```

2. **Verify credentials in backend/.env match docker-compose.yml:**
   ```yaml
   POSTGRES_USER: moore_user
   POSTGRES_PASSWORD: moore_password
   ```

3. **Recreate database:**
   ```bash
   docker compose down -v  # Remove volumes
   docker compose up db    # Restart DB
   ```

### Issue: Port already in use

**Symptoms:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solutions:**

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or change ports in docker-compose.yml:
ports:
  - "3001:3000"  # Frontend on 3001
  - "8001:8000"  # Backend on 8001
```

### Issue: Node modules not installing

**Symptoms:** `Module not found`, missing packages

**Solutions:**

```bash
# Rebuild without cache
docker compose build --no-cache web

# Reinstall dependencies
docker compose exec web npm ci

# Check node_modules
docker compose exec web ls -la node_modules
```

---

## Summary

| Environment | Command | Access |
|---|---|---|
| **Local Dev** | `docker compose up --build` | http://localhost:3000, http://localhost:8000 |
| **Production** | `docker compose -f docker-compose.yml up -d --build` | https://yourdomain.com |
| **Logs** | `docker compose logs -f <service>` | N/A |
| **Shell** | `docker compose exec <service> bash` | Container shell |

