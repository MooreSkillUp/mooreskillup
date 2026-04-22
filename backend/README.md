# More SkillUp Backend

This is the Django REST backend for More SkillUp.

## Included foundations

- custom user model
- teacher and student profiles
- categories and subcategories
- courses, sections, lessons, and tasks
- enrollments and watchlist
- payments and transactions
- notifications and broadcasts
- lesson and course progress
- certificates

## Local runtime requirements

- Python 3.12+
- PostgreSQL
- optionally Redis

## Docker

Use the repository root `docker-compose.yml`.

## Main API groups

- `/api/auth/`
- `/api/courses/`
- `/api/teacher/`
- `/api/payments/`
- `/api/progress/`
- `/api/certificates/`
- `/api/admin/`

## Frontend-aligned endpoints currently scaffolded

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/me/`
- `/api/auth/password-reset/request/`
- `/api/auth/password-reset/confirm/`
- `/api/courses/`
- `/api/my-courses/`
- `/api/watchlist/`
- `/api/payments/`
- `/api/payments/initialize/`
- `/api/payments/verify/`
- `/api/dashboard/student/`
- `/api/dashboard/teacher/`
- `/api/dashboard/admin/`
