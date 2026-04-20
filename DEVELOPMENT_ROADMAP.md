# Development Roadmap

## Phase 1: done

- migrate active frontend to Next.js App Router
- remove old Vite and TanStack Router code
- restore clean lint, typecheck, and production build
- align environment variables with Next.js public env naming

## Phase 2: backend foundation

1. create Django project
2. add DRF, JWT auth, PostgreSQL, and CORS
3. implement user auth and profile APIs
4. wire the frontend auth flow to real endpoints

## Phase 3: course platform APIs

1. implement course, module, and lesson models
2. expose course list and detail endpoints
3. implement lesson completion and notes
4. replace `src/lib/mock-data.ts`

## Phase 4: assessments and gamification

1. implement quizzes and submissions
2. implement points and leaderboard aggregation
3. implement badges and achievements
4. replace `src/lib/quiz-data.ts` and `src/lib/gamification.ts`

## Phase 5: certificates and polish

1. define completion rules
2. issue certificate records
3. decide whether PDF generation stays frontend-side or moves server-side
4. add monitoring, logging, and admin workflows

## Frontend work that can follow

- replace localStorage auth with JWT session handling
- add loading and error states for API fetches
- centralize API access in `src/lib/api.ts`
- add optimistic UI for lesson completion where appropriate
- add route-level tests

## Definition of done for backend integration

- no page depends on mock data for its primary view
- users can register, log in, and return later
- course progress persists
- quiz scores persist
- leaderboard and achievements reflect real user activity
- certificates reflect real completion state
