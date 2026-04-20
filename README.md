# MooreSkillUp

MooreSkillUp is a Next.js learning platform frontend with mock data, client-side auth, quizzes, certificates, leaderboard views, achievements, and a public contact page.

The frontend currently runs standalone. The Django backend is not implemented yet, but this repo now includes updated documentation for building it against the current Next.js app.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- jsPDF

## Current routes

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/courses`
- `/course/[id]`
- `/lesson/[id]`
- `/quiz/[id]`
- `/leaderboard`
- `/achievements`
- `/certificates`
- `/settings`
- `/contact`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_FORMSPREE_FORM_ID=f/YOUR_FORMSPREE_FORM_ID
NEXT_PUBLIC_WHATSAPP_NUMBER=1234567890
NEXT_PUBLIC_APP_NAME=MooreSkillUp
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project structure

```text
src/
  app/                    Next.js routes
  components/
    dashboard/            App shell and dashboard UI
    ui/                   shadcn-style primitives
    ui-kit/               custom inputs, buttons, progress bar
  hooks/
  lib/
    auth.tsx              mock auth provider
    certificate.ts        PDF certificate generation
    gamification.ts       leaderboard, badges, stats mock data
    mock-data.ts          courses, modules, lessons, announcements
    public-env.ts         public environment variable access
    quiz-data.ts          quiz mock data
    theme.tsx             theme provider
    utils.ts              utility helpers
```

## Backend status

The current frontend still uses mock data and localStorage auth:

- `src/lib/auth.tsx`
- `src/lib/mock-data.ts`
- `src/lib/quiz-data.ts`
- `src/lib/gamification.ts`

When you are ready to build the backend, start here:

- [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md)
- [API_SCHEMA.md](./API_SCHEMA.md)
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Documentation map

- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)
- [FORMSPREE_SETUP.md](./FORMSPREE_SETUP.md)

## Notes

- The old Vite/TanStack Router migration leftovers have been removed.
- The active app is the Next.js App Router implementation under `src/app`.
- The current build, lint, and typecheck all pass.
