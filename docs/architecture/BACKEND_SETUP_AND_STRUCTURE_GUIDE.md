# Backend Setup and Structure Guide

This guide explains:

- where the More SkillUp backend lives
- whether you need to move it
- how to run it
- what the backend folder structure means
- what to do next to make it fully working

## 1. Do You Need to Move the Backend?

No.

You do not need to move the backend to a separate repository or outside this project folder.

The current structure is already valid:

```text
mooreskillup/
  src/                 frontend
  backend/             django backend
  docker-compose.yml   shared local services
```

This means:

- the frontend stays in `src/`
- the backend stays in `backend/`
- both can live in one project during development

This is called a monorepo-style setup, and it is completely fine.

## 2. Where the Backend Is

The backend is here:

[backend](C:/TECH/Dev/mooreskillup/backend)

Main entry points:

- [backend/manage.py](C:/TECH/Dev/mooreskillup/backend/manage.py)
- [backend/config/urls.py](C:/TECH/Dev/mooreskillup/backend/config/urls.py)
- [backend/config/settings/base.py](C:/TECH/Dev/mooreskillup/backend/config/settings/base.py)
- [docker-compose.yml](C:/TECH/Dev/mooreskillup/docker-compose.yml)

## 3. Backend Folder Structure

### Root layout

```text
backend/
  manage.py
  .env.example
  README.md
  requirements/
  config/
  common/
  apps/
  docker/
```

### What each part does

#### `manage.py`

This is Django’s command file.

You use it for:

- migrations
- creating admin users
- starting the Django server

#### `requirements/`

This contains Python dependencies.

- `base.txt`: core backend packages
- `dev.txt`: local development packages
- `prod.txt`: production packages

#### `config/`

This is the main Django project configuration.

- `urls.py`: connects all API routes
- `asgi.py`: ASGI startup
- `wsgi.py`: WSGI startup
- `settings/`: Django settings files

#### `config/settings/`

- `base.py`: shared settings
- `dev.py`: local development settings
- `prod.py`: production settings
- `test.py`: test settings

#### `common/`

This contains shared backend utilities.

Right now it includes:

- base model helpers
- shared permission classes

#### `apps/`

This contains the real backend business logic.

Each folder is one Django app.

Current apps:

- `accounts`
- `categories`
- `courses`
- `enrollments`
- `payments`
- `notifications`
- `progress`
- `certificates`

#### `docker/`

This contains backend Docker files.

- `docker/django/Dockerfile`
- `docker/django/entrypoint.sh`

## 4. What Each App Handles

### `accounts`

Handles:

- custom user model
- teacher profile
- student profile
- login/register
- password reset

Key files:

- [backend/apps/accounts/models.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/models.py)
- [backend/apps/accounts/views.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/views.py)
- [backend/apps/accounts/urls.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/urls.py)

### `categories`

Handles:

- categories
- subcategories
- admin category management

### `courses`

Handles:

- courses
- tags
- sections
- lessons
- tasks
- teacher course publishing
- public course browsing

### `enrollments`

Handles:

- course ownership
- my courses
- watchlist

### `payments`

Handles:

- payment records
- transactions
- payment initialize
- payment verify
- webhook placeholders

### `notifications`

Handles:

- user notifications
- admin broadcasts

### `progress`

Handles:

- lesson progress
- course progress
- course completion state

### `certificates`

Handles:

- certificate records
- certificate generation endpoint

## 5. What You Need Before Running It

Right now, the backend code exists, but this machine does not yet have a Python runtime available in PATH.

That means you need at least one of these:

### Option A: Run with Docker

This is the easiest option if Docker Desktop is installed.

You need:

- Docker Desktop

### Option B: Run with local Python

You need:

- Python 3.12 or later
- PostgreSQL

## 6. Recommended Way to Run It

Use Docker first.

That is the smoothest path because:

- PostgreSQL starts automatically
- backend dependencies install inside the container
- you do not need to manually set up Python packages globally

## 7. How to Run the Backend with Docker

### Step 1: Install Docker Desktop

Download and install Docker Desktop for Windows.

After installing, open Docker Desktop and make sure it is running.

### Step 2: Open the project folder

Open terminal in:

```text
C:\TECH\Dev\mooreskillup
```

### Step 3: Create backend environment file

Copy:

[backend/.env.example](C:/TECH/Dev/mooreskillup/backend/.env.example)

to:

```text
backend/.env
```

You can start with the same values during local development.

### Step 4: Update Docker Compose to use the real env file

Right now `docker-compose.yml` points to `backend/.env.example`.

For real local use, change it to:

```yaml
env_file:
  - backend/.env
```

File:

[docker-compose.yml](C:/TECH/Dev/mooreskillup/docker-compose.yml)

### Step 5: Start the containers

Run:

```bash
docker compose up --build
```

This will start:

- PostgreSQL
- Redis
- Django backend

### Step 6: Run migrations

Open another terminal and run:

```bash
docker compose exec api python manage.py makemigrations
docker compose exec api python manage.py migrate
```

### Step 7: Create admin user

Run:

```bash
docker compose exec api python manage.py createsuperuser
```

### Step 8: Open the backend

Backend base:

```text
http://localhost:8000/
```

Admin panel:

```text
http://localhost:8000/admin/
```

API examples:

```text
http://localhost:8000/api/auth/register/
http://localhost:8000/api/courses/
http://localhost:8000/api/categories/
```

## 8. How to Run It Without Docker

If you want local Python execution instead:

### Step 1: Install Python

Install Python 3.12+ and make sure `python` works in terminal.

### Step 2: Create virtual environment

Inside:

```text
C:\TECH\Dev\mooreskillup\backend
```

run:

```bash
python -m venv .venv
```

### Step 3: Activate virtual environment

On PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

If PowerShell blocks it, use Command Prompt:

```bash
.venv\Scripts\activate.bat
```

### Step 4: Install dependencies

Run:

```bash
pip install -r requirements/dev.txt
```

### Step 5: Create backend env file

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

### Step 6: Set Django settings module

Usually `manage.py` already defaults to development settings, so you can go straight to:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Step 7: Make sure PostgreSQL is running

You must create a PostgreSQL database matching the values in `.env`.

Default values currently expected:

- database: `mooreskillup`
- user: `postgres`
- password: `postgres`
- host: `localhost`
- port: `5432`

## 9. Important Current State of the Backend

The backend is scaffolded and partially implemented.

That means:

- structure exists
- apps exist
- models exist
- URLs exist
- serializers and views exist

But you still need to do the normal Django bootstrapping steps:

- install Python or use Docker
- install dependencies
- generate migrations
- migrate the database
- create a superuser
- test endpoints

## 10. Current API Route Groups

The root API connections are in:

[backend/config/urls.py](C:/TECH/Dev/mooreskillup/backend/config/urls.py)

Connected route groups:

- `/api/auth/`
- `/api/categories`
- `/api/courses`
- `/api/teacher/courses`
- `/api/watchlist/`
- `/api/my-courses/`
- `/api/payments/`
- `/api/progress/`
- `/api/certificates/`
- `/api/admin/...`

## 11. Suggested Working Order

After you get it running, work in this order:

### Phase 1

- run migrations
- create superuser
- open Django admin
- verify models appear

### Phase 2

- test auth endpoints
- test category creation
- test course creation

### Phase 3

- test enrollments and watchlist
- test payment initialize and verify flow

### Phase 4

- test lesson progress
- test certificate generation

## 12. Best Practice Recommendation

Keep the backend where it is now.

Recommended final structure:

```text
mooreskillup/
  src/                  frontend
  backend/              django backend
  docker-compose.yml    local orchestration
  README.md             frontend/general project docs
  backend/README.md     backend-specific docs
```

This is easier to manage than splitting them too early.

Only move the backend to a separate repository later if:

- your team wants separate deployment pipelines
- frontend and backend will be maintained by separate teams
- you want independent versioning

## 13. Most Important Files to Understand First

Start with these:

- [backend/manage.py](C:/TECH/Dev/mooreskillup/backend/manage.py)
- [backend/config/settings/base.py](C:/TECH/Dev/mooreskillup/backend/config/settings/base.py)
- [backend/config/urls.py](C:/TECH/Dev/mooreskillup/backend/config/urls.py)
- [backend/apps/accounts/models.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/models.py)
- [backend/apps/courses/models.py](C:/TECH/Dev/mooreskillup/backend/apps/courses/models.py)
- [backend/apps/payments/models.py](C:/TECH/Dev/mooreskillup/backend/apps/payments/models.py)
- [backend/apps/progress/models.py](C:/TECH/Dev/mooreskillup/backend/apps/progress/models.py)

## 14. If You Want Me to Continue

I can help you with the next step in either of these ways:

1. I can refine this backend so it is closer to production-ready before you run it.
2. I can walk you step-by-step through installing Python and running migrations.
3. I can prepare initial Django migration files and seed data structure.
4. I can align the backend responses exactly to the current frontend mock structure.
