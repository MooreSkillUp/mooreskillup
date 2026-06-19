# MooreSkillUp — Production Roadmap

> The master plan for taking MooreSkillUp from its current state to a fully
> production-ready Learning Management System. Updated as phases complete.
>
> Last updated: 2026-06-12

## How this project is built

- **Frontend:** Next.js 15 + React 19 + Tailwind 4 (`src/`)
- **Backend:** Django 5 + Django REST Framework + PostgreSQL (`backend/`)
- **Approach:** one role at a time, top-down — Admin → Teacher → Student → Money → Launch.
  Each phase is planned and agreed before any code is written.

## The roles

| Role | Who | How they get an account |
|---|---|---|
| **Super Admin** | Platform owner | One-time token-gated bootstrap, then closed forever |
| **Admin** | Operations staff | Created by Super Admin with temp password |
| **Moderator** | Course/support reviewers | Created by Super Admin with temp password |
| **Teacher** | Course authors | Created by Admin/Super Admin with temp password |
| **Student** | Learners | Public self-registration (can be toggled off in Settings) |

---

## Phase 1 — Admin Foundation & Tiered Roles ✅ COMPLETE

Three admin ranks enforced by the server, admin team management, permanent
audit trail, platform settings, scheduled broadcasts, security hardening.

➡ Full details: [PHASE_1_ADMIN_SYSTEM.md](./PHASE_1_ADMIN_SYSTEM.md)

**Note:** some refinements are still wanted on the admin system — they are
listed in the "Still to work on" section of the Phase 1 document and will be
revisited after the remaining phases.

## Phase 2 — Teacher Module ✅ COMPLETE

Full Teacher Studio rebuild (no image uploads, by design): course level,
free/paid + discount pricing, SEO, tech-stack tags, 5 lesson types (video,
text, resource, assignment via WhatsApp/Form/external link, project),
content-validation gate, student-accurate preview with desktop/tablet/mobile
toggle, per-teacher analytics + CSV, student management + CSV, duplicate
course, version history/restore, configurable approval hierarchy, announcement
permission toggles, and a full MooreSkillUp certificate system (template,
auto-issue on completion, `MSU-XXXX` IDs, public verification page, revoke).
Plus: fixed the studio's backwards-typing bug. 55 backend tests passing.

➡ Details: [PHASE_2_TEACHER_ROADMAP.md](./PHASE_2_TEACHER_ROADMAP.md)

## Phase 3 — Student Learning Loop (the big one)

The entire student experience currently runs on temporary browser-stored
mock data (`src/lib/teacher-workspace.tsx`) even though the backend already
has real endpoints for all of it. This phase replaces it page by page:

1. Public course catalog from the real database
2. Course detail page (published courses, free preview lessons)
3. Free enrollment flow
4. Lesson player with real progress saving (resume where you stopped)
5. "My courses" dashboard with real progress bars
6. Task submission (student side — pairs with Phase 2's teacher side)
7. Server-issued certificates with public verification links
8. Adopt TanStack Query (already installed) for clean data loading

## Phase 4 — Real Commerce 💰

**Critical security note:** payment verification currently trusts the client —
it must never go live as-is.

1. Real Paystack integration (initialize on the server, real checkout URL)
2. Webhook with signature verification as the source of truth
3. Verify endpoint that actually calls Paystack's verify API
4. Refund flow for Super Admin (`payments:refund` permission already exists)
5. Email receipts
6. (Decision: drop or defer OPay — one gateway done right first)

## Phase 5 — Communication & Analytics

1. Transactional emails: enrollment confirmations, course approved/declined,
   broadcast emails, ticket replies (currently only password-reset emails exist)
2. Students can create support tickets (backend currently allows teachers only)
3. Real analytics endpoints with date ranges and CSV export
4. Pagination on all admin list endpoints

## Phase 6 — Hardening & Deployment 🚀

1. Error monitoring (Sentry on both sides)
2. API documentation (drf-spectacular)
3. Durable file storage (Cloudflare R2/S3 — media on local disk vanishes on redeploy)
4. CI pipeline (GitHub Actions: lint, typecheck, tests, build on every push)
5. Promote ESLint from advisory to build-blocking
6. Deploy: Railway (backend) + Vercel (frontend), full smoke test
7. Database backup schedule

## Phase 7 — Post-launch features

- Quizzes backend (frontend exists, no backend)
- Gamification: leaderboard, achievements, streaks
- Course reviews & ratings
- Video hosting strategy (uploads vs YouTube/Vimeo embeds)
- Real-time updates (websockets)
- Admin refinements from the Phase 1 "still to work on" list

---

## Standing rules for every phase

- Server-side security first — the UI hiding a button is never enough
- No dead buttons: every visible control must actually work
- Every phase ships with tests (backend suite lives in `backend/apps/*/tests/`)
- Type checking must stay green (`npx tsc --noEmit`); builds fail on type errors
- All admin mutations get an audit log entry
- Plan → agree → build, phase by phase
