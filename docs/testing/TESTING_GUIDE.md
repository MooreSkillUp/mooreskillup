# Testing Your Monorepo Locally

## Quick Start

```bash
# Start all services
docker compose up --build

# In another terminal, run tests
docker compose exec api pytest
```

## Testing Checklist

### 1. Verify All Services Started

```bash
docker compose ps
```

Expected output: All services `Up` ✓

### 2. Test Backend API

```bash
# Test a simple endpoint
curl http://localhost:8000/admin/

# Or test your custom endpoint
curl http://localhost:8000/api/your-endpoint/
```

### 3. Test Frontend Loads

Open browser: http://localhost:3000

Check console (F12) for:
- No CORS errors
- API requests showing in Network tab

### 4. Test Frontend-to-Backend Communication

Open browser DevTools → Network tab and navigate frontend.

Look for:
- `http://localhost:8000/api/*` requests from frontend
- Status 200 responses
- No CORS errors in Console

**If CORS error appears:**
```python
# backend/settings.py - Add this
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://web:3000",
]
```

Then restart: `docker compose restart api`

### 5. Test Database

```bash
# Enter PostgreSQL shell
docker compose exec db psql -U moore_user -d mooreskillup

# Check tables
\dt

# Run a query
SELECT * FROM your_table;

# Exit
\q
```

### 6. Run Backend Tests

```bash
# Run pytest
docker compose exec api pytest

# Run with verbose output
docker compose exec api pytest -v

# Run specific test file
docker compose exec api pytest tests/test_file.py

# Run with coverage report
docker compose exec api pytest --cov=backend
```

### 7. Check Logs

```bash
# All services
docker compose logs

# Specific service (follow mode)
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Last 100 lines
docker compose logs --tail=100
```

### 8. Test Hot Reload

**Frontend:**
```bash
# Edit src/app/page.tsx
# Changes should appear at http://localhost:3000 within 1-2 seconds
```

**Backend:**
```bash
# Edit backend/views.py
# Changes should reload automatically
```

## Common Issues

### Frontend can't reach backend

**Error:** `fetch failed`, `Connection refused`

**Fix:**
```bash
# Check backend is running
docker compose logs api

# Ensure CORS is configured
docker compose restart api
```

### Port already in use

**Error:** `Bind for 0.0.0.0:3000 failed`

**Fix:**
```bash
# Use different ports
# In docker-compose.yml:
# ports:
#   - "3001:3000"  # Changed from 3000
#   - "8001:8000"  # Changed from 8000

# Or kill the process
lsof -i :3000
kill -9 <PID>
```

### Database connection error

**Error:** `FATAL: Ident authentication failed`

**Fix:**
```bash
# Rebuild database
docker compose down -v
docker compose up db
docker compose up api
```

### Module not found

**Error:** `Cannot find module`

**Fix:**
```bash
# Rebuild frontend
docker compose build --no-cache web
docker compose exec web npm ci
```

## Manual Testing Examples

### Test with cURL

```bash
# GET request
curl http://localhost:8000/api/endpoint/

# POST request
curl -X POST http://localhost:8000/api/endpoint/ \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# With authentication header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/protected/
```

### Test with JavaScript

```javascript
// In browser console at http://localhost:3000
const response = await fetch('http://localhost:8000/api/endpoint/');
const data = await response.json();
console.log(data);
```

### Database Testing

```bash
# Access Django shell
docker compose exec api python manage.py shell

# Create test data
from yourapp.models import YourModel
obj = YourModel.objects.create(name="test")
print(obj)
```

## Performance Testing

```bash
# Check resource usage
docker stats

# Example output:
# CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT
# abc123         mooreskillup-api  0.5%      150MiB / 2GiB
# def456         mooreskillup-web  0.2%      120MiB / 2GiB
```

## Cleanup

```bash
# Stop all services
docker compose down

# Remove volumes (delete database)
docker compose down -v

# Rebuild everything
docker compose build --no-cache
```

## Environment Variables for Testing

Create `.env.test` if needed:

```env
DEBUG=True
DJANGO_SETTINGS_MODULE=settings.test
DATABASE_URL=postgresql://moore_user:password@localhost:5432/mooreskillup_test
```

Load in compose:
```yaml
api:
  env_file:
    - backend/.env
    - .env.test
```
