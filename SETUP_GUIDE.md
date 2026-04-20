# Setup Guide

## What this project is

MooreSkillUp is a Next.js frontend for an online learning platform. It currently uses mock data and client-side state so you can run and review the product before the Django backend exists.

The UI already covers:

- public marketing landing page
- registration and login screens
- authenticated dashboard
- course listing and detail pages
- lesson player pages
- quiz flow
- certificates
- leaderboard
- achievements
- profile settings
- contact page

## Requirements

- Node.js 20+
- npm 10+

## First-time setup

1. Install dependencies.

```bash
npm install
```

2. Create local environment variables.

```bash
copy .env.example .env.local
```

3. Start the dev server.

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Important files

### App routes

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/courses/page.tsx`
- `src/app/course/[id]/page.tsx`
- `src/app/lesson/[id]/page.tsx`
- `src/app/quiz/[id]/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/achievements/page.tsx`
- `src/app/certificates/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/contact/page.tsx`

### Core state and mock data

- `src/lib/auth.tsx`
- `src/lib/mock-data.ts`
- `src/lib/quiz-data.ts`
- `src/lib/gamification.ts`
- `src/lib/certificate.ts`

### Shared UI shell

- `src/components/dashboard/AppShell.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/TopNavbar.tsx`

## How the app works today

### Authentication

Authentication is mock-only for now.

- login and register write a user into localStorage
- `AuthProvider` exposes `user`, `isAuthenticated`, `login`, `register`, `logout`, and `updateUser`
- protected pages are gated in `AppShell`

### Data

All course, lesson, quiz, achievement, leaderboard, and announcement data is in memory from the `src/lib/*` files listed above.

### Certificates

Certificates are generated in the browser using `jsPDF` from `src/lib/certificate.ts`.

### Contact page

The contact form posts directly to Formspree using public environment variables.

## Recommended backend migration order

1. Build Django auth and user profile APIs.
2. Build course, module, lesson, and progress APIs.
3. Build quiz submission and score APIs.
4. Build leaderboard, achievement, and certificate APIs.
5. Replace mock data calls page by page.

Use these docs next:

- [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md)
- [API_SCHEMA.md](./API_SCHEMA.md)

## Validation commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Local testing checklist

- landing page loads
- login redirects to dashboard
- register redirects to dashboard
- dashboard links to courses, lessons, and quizzes
- course detail expands modules
- lesson page renders embedded video
- quiz page can complete and show result state
- certificates page loads and can generate PDF
- settings page updates stored user profile
- contact page renders and submits with configured Formspree values
