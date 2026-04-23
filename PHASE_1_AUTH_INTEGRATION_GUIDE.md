# Phase 1: Real Authentication Integration

## Goal

Replace mock auth with real backend auth so:

- `student`, `teacher`, and `admin` can register or log in with email and password
- the frontend session comes from Django auth and JWT tokens
- `/api/auth/me/` becomes the source of truth for the logged-in user
- forgot-password and reset-password use a real backend flow

## Decision Summary

### 1. Admin profile

You asked whether an `AdminProfile` model is needed.

For this Phase 1, the answer is:

- `No`, not yet
- `User.role = "admin"` is enough for:
  - admin login
  - admin dashboard routing
  - admin permissions

Create a separate `AdminProfile` only if the admin dashboard later needs admin-only fields such as:

- department
- permission group label
- audit signature
- avatar moderation fields

For now, keeping admin on the main `User` model is cleaner and matches the frontend well.

### 2. What is already implemented vs what comes next

This is the current backend/frontend auth status for Phase 1:

- `Student registration` is public
- `Student registration` does not require auth
- `Student login` uses the same shared login page as every other user
- `Teacher login` uses the same shared login page as every other user
- `Admin login` uses the same shared login page as every other user
- `Forgot password` is shared by all users
- `Reset password` is shared by all users

This is also implemented:

- a dedicated `admin register` route exists for controlled bootstrap
- a dedicated `teacher register` frontend page exists and is connected to real auth

But this part is **not** implemented yet as admin dashboard behavior:

- admin dashboard table/form for creating teachers inside the admin workspace
- admin-only teacher creation UI with category/subcategory assignment from live backend data
- registration pages loading category/subcategory choices from backend instead of frontend mock data

So the rule for now is:

- `students` can self-register now
- `admins` can be created now through the protected bootstrap route
- `teachers` can be created now through the connected teacher registration flow

And the rule for the next phase is:

- move teacher creation fully into admin dashboard behavior
- make category/subcategory options come from backend-managed platform data

## What Was Aligned

### Backend

The backend auth layer now supports:

- `POST /api/auth/register/`
- `POST /api/auth/admin-register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `PATCH /api/auth/me/`
- `POST /api/auth/password-reset/request/`
- `POST /api/auth/password-reset/confirm/`

It also now:

- accepts frontend-style fields like `displayName`, `selectedInterest`, and `selectedTrack`
- creates `TeacherProfile` for teacher accounts
- creates `StudentProfile` for student accounts
- protects admin bootstrap with `ADMIN_REGISTRATION_TOKEN`
- sends password reset emails through Django email settings
- returns debug reset token and reset URL in `DEBUG=True` for local testing

### Frontend

The frontend auth layer now:

- stores JWT `access` and `refresh` tokens
- loads current user from `/api/auth/me/`
- refreshes access token automatically on `401`
- routes by real backend role
- clears session on logout
- uses backend auth for:
  - login
  - register
  - admin register
  - teacher register
  - forgot password
  - reset password

## Route Clarification

### Shared login

All users use the same login page:

- `/auth/login`

The backend decides who they are after authentication:

- `student` goes to `/dashboard`
- `teacher` goes to `/teacher/dashboard`
- `admin` goes to `/admin/dashboard`

### Student registration

Student registration is public:

- frontend route: `/auth/register`
- backend endpoint: `POST /api/auth/register/`

This does **not** require auth.

### Admin registration

Admin registration is controlled:

- frontend route: `/auth/admin-register`
- backend endpoint: `POST /api/auth/admin-register/`

This does **not** require an already logged-in admin, but it **does** require:

- `ADMIN_REGISTRATION_TOKEN`

That route exists for bootstrap/setup, not open public sign-up.

### Teacher registration

Teacher registration currently exists as a connected auth flow:

- frontend route: `/auth/teacher-register`
- backend endpoint: `POST /api/auth/register/` with `role=teacher`

Right now it works.

But product-wise, this should move into admin behavior next, where:

- admin creates teachers from the admin dashboard
- teacher creation becomes an admin-managed action instead of a general route

## Password Reset Flow

Password reset is currently designed as a `reset link / token` flow, not a short numeric code.

The flow is:

1. user enters email on `/auth/forgot-password`
2. frontend calls `POST /api/auth/password-reset/request/`
3. backend creates a reset token
4. backend sends an email with a reset link
5. user opens `/auth/reset-password?token=...`
6. frontend calls `POST /api/auth/password-reset/confirm/`
7. backend validates token and saves the new password

For local development:

- if `DEBUG=True`, the backend can also return `debugToken` and `debugResetUrl`
- this helps you test without full SMTP delivery

## Main Files

### Frontend

- [src/lib/auth.tsx](C:/TECH/Dev/mooreskillup/src/lib/auth.tsx)
- [src/app/auth/login/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/login/page.tsx)
- [src/app/auth/register/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/register/page.tsx)
- [src/app/auth/teacher-register/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/teacher-register/page.tsx)
- [src/app/auth/admin-register/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/admin-register/page.tsx)
- [src/app/auth/forgot-password/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/forgot-password/page.tsx)
- [src/app/auth/reset-password/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/reset-password/page.tsx)
- [src/components/dashboard/AppShell.tsx](C:/TECH/Dev/mooreskillup/src/components/dashboard/AppShell.tsx)

### Backend

- [backend/apps/accounts/models.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/models.py)
- [backend/apps/accounts/serializers.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/serializers.py)
- [backend/apps/accounts/views.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/views.py)
- [backend/apps/accounts/urls.py](C:/TECH/Dev/mooreskillup/backend/apps/accounts/urls.py)
- [backend/config/settings/base.py](C:/TECH/Dev/mooreskillup/backend/config/settings/base.py)
- [backend/.env.example](C:/TECH/Dev/mooreskillup/backend/.env.example)

## Environment Setup Needed Before Testing

Create:

- `backend/.env`

Start from:

- [backend/.env.example](C:/TECH/Dev/mooreskillup/backend/.env.example)

Important values:

- `DJANGO_SECRET_KEY`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `CORS_ALLOWED_ORIGINS=http://localhost:3000`
- `FRONTEND_URL=http://localhost:3000`
- `ADMIN_REGISTRATION_TOKEN=your-secure-bootstrap-token`
- email settings if you want real SMTP delivery

For local testing, console email is enough:

- `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`

## Recommended Test Order

### 1. Backend auth health

Test:

- `GET /api/auth/health/`

Expected:

- `{ "status": "ok" }`

### 2. Student register

Use:

- `/auth/register`

Expected:

- backend returns `access`, `refresh`, and `user`
- frontend redirects to `/dashboard`

### 3. Teacher register

Use:

- `/auth/teacher-register`

Expected:

- `TeacherProfile` is created
- frontend redirects to `/teacher/dashboard`
- this is working now, but later should be moved into admin dashboard behavior

### 4. Admin register

Use:

- `/auth/admin-register`

Expected:

- requires the admin bootstrap token
- frontend redirects to `/admin/dashboard`

### 5. Login

Test all:

- student login
- teacher login
- admin login

Expected:

- same login page for all roles
- correct dashboard per role
- tokens saved in browser storage

### 6. Refresh token

Expected:

- expired access token refreshes automatically
- user stays logged in if refresh token is valid

### 7. Protected routes

Expected:

- unauthenticated user is redirected to `/auth/login`
- wrong role is redirected to the correct dashboard home

### 8. Forgot password

Expected:

- backend returns success message
- email is sent through configured email backend
- in local debug mode, frontend can show `debugToken`

### 9. Reset password

Expected:

- valid token resets password
- invalid or used token is rejected
- user can log in with the new password

## What Still Needs Runtime Verification

This repo now has the real Phase 1 auth structure, but you still need to run it and verify it because this machine does not currently have Python available in PATH.

That means these still need to be done in your local runtime:

- `makemigrations`
- `migrate`
- create first admin or use admin bootstrap route
- run Django server
- test end-to-end frontend to backend auth flow

## After Phase 1

Once this auth phase is verified, the next best step is:

- build `admin behavior`

That admin phase should include:

- category creation
- subcategory creation
- teacher creation inside admin dashboard
- backend-driven category/subcategory options on registration and course forms
- platform management flows that drive the rest of the LMS
