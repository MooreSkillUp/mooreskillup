# Django Integration Guide

This guide is written for the current Next.js frontend in this repo.

## Goal

Replace the mock frontend state with a Django REST API that supports:

- JWT auth
- user profile management
- course catalog and enrollment state
- lesson progress and notes
- quizzes and submissions
- leaderboard and achievements
- certificate records

## Recommended backend stack

- Django 5
- Django REST Framework
- PostgreSQL
- djangorestframework-simplejwt
- django-cors-headers

Optional:

- Celery for async certificate generation
- django-storages for cloud file storage

## Suggested Django app layout

```text
backend/
  manage.py
  config/
    settings/
    urls.py
  apps/
    users/
    courses/
    progress/
    quizzes/
    gamification/
    certificates/
```

## Setup

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install django djangorestframework djangorestframework-simplejwt psycopg[binary] django-cors-headers
django-admin startproject config .
python manage.py startapp users
python manage.py startapp courses
python manage.py startapp progress
python manage.py startapp quizzes
python manage.py startapp gamification
python manage.py startapp certificates
```

## Core settings

### `INSTALLED_APPS`

Add:

- `rest_framework`
- `corsheaders`
- `rest_framework_simplejwt`
- your project apps

### Middleware

Put `corsheaders.middleware.CorsMiddleware` near the top.

### REST framework

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}
```

### CORS

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

## Recommended models

### `users`

- custom `User`
- fields:
  - `username`
  - `email`
  - `display_name`
  - `avatar`
  - `joined_at`

### `courses`

- `Course`
- `Module`
- `Lesson`

Recommended fields:

- `Course.slug`
- `Course.title`
- `Course.description`
- `Course.instructor_name`
- `Course.cover_style`
- `Module.course`
- `Module.title`
- `Module.week`
- `Lesson.module`
- `Lesson.slug`
- `Lesson.title`
- `Lesson.duration_minutes`
- `Lesson.video_id`
- `Lesson.description`
- `Lesson.order`

### `progress`

- `Enrollment`
- `LessonProgress`
- `LessonNote`

Recommended fields:

- `Enrollment.user`
- `Enrollment.course`
- `Enrollment.created_at`
- `LessonProgress.user`
- `LessonProgress.lesson`
- `LessonProgress.completed`
- `LessonProgress.completed_at`
- `LessonNote.user`
- `LessonNote.lesson`
- `LessonNote.body`

### `quizzes`

- `Quiz`
- `QuizQuestion`
- `QuizSubmission`
- `QuizAnswer`

Recommended fields:

- `Quiz.course`
- `Quiz.title`
- `Quiz.description`
- `Quiz.passing_score`
- `Quiz.points_reward`
- `QuizQuestion.quiz`
- `QuizQuestion.prompt`
- `QuizQuestion.options`
- `QuizQuestion.correct_index`
- `QuizQuestion.explanation`
- `QuizSubmission.user`
- `QuizSubmission.quiz`
- `QuizSubmission.score`
- `QuizSubmission.total`
- `QuizSubmission.score_pct`
- `QuizSubmission.passed`

### `gamification`

- `Badge`
- `UserBadge`
- `LeaderboardSnapshot` or compute from aggregates

### `certificates`

- `Certificate`

Recommended fields:

- `Certificate.user`
- `Certificate.course`
- `Certificate.code`
- `Certificate.issued_at`
- `Certificate.pdf_file`

## Implementation order

### Phase 1: auth

Build:

- register endpoint
- login endpoint
- refresh endpoint
- current user endpoint
- update profile endpoint

Once this is done, replace `src/lib/auth.tsx` localStorage login with real API calls.

### Phase 2: courses and lessons

Build:

- list courses
- course detail with modules and lessons
- lesson detail

Once this is done, replace reads from `src/lib/mock-data.ts`.

### Phase 3: progress

Build:

- mark lesson complete
- save lesson notes
- dashboard summary endpoint

### Phase 4: quizzes

Build:

- quiz detail endpoint
- quiz submission endpoint
- score calculation service

### Phase 5: gamification and certificates

Build:

- leaderboard endpoint
- achievements endpoint
- certificate list endpoint
- certificate generation flow

## Serializer shape guidance

Keep frontend output close to [API_SCHEMA.md](./API_SCHEMA.md). That will let you replace mock data with minimal UI rewrites.

For nested course detail, return:

- course base fields
- modules ordered by week
- lessons ordered by lesson order
- user-specific lesson status embedded in lesson objects

## Next.js integration notes

Use this environment variable in the frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

When you are ready, create a real API client in `src/lib/api.ts` and migrate page-by-page from mock imports to fetch calls.

## Recommended URL layout

```text
/api/auth/register/
/api/auth/login/
/api/auth/refresh/
/api/auth/me/
/api/courses/
/api/courses/<course_id>/
/api/lessons/<lesson_id>/
/api/lessons/<lesson_id>/complete/
/api/lessons/<lesson_id>/notes/
/api/dashboard/
/api/quizzes/<quiz_id>/
/api/quizzes/<quiz_id>/submit/
/api/leaderboard/
/api/achievements/
/api/certificates/
/api/certificates/<course_id>/generate/
```

## Local backend checklist

- PostgreSQL database created
- migrations run
- superuser created
- CORS allows `http://localhost:3000`
- JWT auth working
- `/api/auth/login/` tested
- `/api/courses/` tested
- `/api/courses/<id>/` tested
- `/api/quizzes/<id>/submit/` tested

## Recommended frontend migration sequence after backend exists

1. swap auth
2. swap courses and lessons
3. swap dashboard
4. swap quizzes
5. swap achievements and leaderboard
6. swap certificates

That order keeps the app usable while you move from mocks to real data.
