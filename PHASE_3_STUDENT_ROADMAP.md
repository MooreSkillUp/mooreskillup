# Phase 3 — Student Module (PROPOSED — review, then build)

> The student experience is the **biggest gap**: almost all of it currently runs
> on temporary browser data (`src/lib/teacher-workspace.tsx`, a ~2,050-line
> localStorage mock) — so progress and enrollments vanish on refresh/redeploy,
> even though the backend already has real endpoints for nearly all of it.
>
> This phase moves the whole student journey onto the real backend, page by page.
> **Nothing here is built yet.** Read it, tell me what to add/remove, then we
> build milestone by milestone — same rhythm as Phases 1 & 2 (plan → confirm →
> build → test).

## Core principle
A student account is the real source of truth: what they're enrolled in, where
they stopped in each lesson, what they've completed, and which certificates they
earned — all stored server-side and surviving logout, refresh, and redeploys.

## What students have TODAY (but on mock data — must be migrated)
Catalog browsing, course detail, lesson player, dashboard, "my courses",
certificates page, wishlist — all visually built, but reading/writing the
localStorage mock instead of the API.

## What the backend ALREADY provides (ready to wire)
- Public catalog: `GET /api/courses/`
- Course detail with locked/free sections + preview lessons
- Free enrollment + "my courses": `/api/my-courses/`, `/api/watchlist/`
- Lesson progress (resume where you stopped): `/api/progress/lessons/<id>/`, `/api/progress/courses/<id>/`
- Student dashboard: `/api/dashboard/student/`
- Certificates list + generate + **template** + **public verification** (built in Phase 2)

So most of this phase is **wiring, not new backend** — except paid unlocking,
which is Phase 4 (real payments).

---

## Proposed milestones

### S1 — Catalog & course detail (real API)
- Public course catalog from `/api/courses/` (search, filter by category/level, tech-stack chips).
- Course detail page: real sections/lessons, **free preview** lessons playable, paid sections shown locked,
  discounted price display, "About this course", level, what you'll learn.
- Replace the static marketing catalog with real published courses.

### S2 — Enrollment & "My Courses"
- **Free enrollment** (one click) for free courses / free sections.
- "My Courses" dashboard from real enrollments with **real progress bars**.
- Wishlist on the real API.
- (Paid enrollment shows a "Buy" CTA that becomes real in Phase 4.)

### S3 — Lesson player & progress (the heart)
- Real lesson player: video (YouTube/Vimeo embed), text, **resource** downloads.
- **Assignments** show the submission button (WhatsApp group / form / link) + "how to submit".
- **Projects** show requirements/deliverables + submission link.
- **Progress tracking**: mark lessons complete, **resume where you stopped**, course % updates live.
- Section locking respects free vs paid + enrollment.

### S4 — Completion & certificates (wire to Phase 2 engine)
- On finishing a certificate-enabled course → certificate **auto-issues** (already built backend-side).
- Student **certificates page** lists real certificates and **downloads a PDF** (jsPDF) styled by the
  admin's certificate template, showing the **`MSU-XXXX` ID + verification URL**.
- "Verify" link points anyone to the public `/verify/<code>` page.

### S5 — Student dashboard & profile
- Dashboard: continue-learning card, recent courses, recommended courses, notifications — all real.
- Settings/profile: display name, avatar, interests/tracks, password change (mostly wired already — finish it).

### S6 — Cleanup & quality
- Delete the dead mock (`teacher-workspace.tsx`) once every student page is migrated.
- Adopt **TanStack Query** (already installed, unused) for clean caching/loading/refetch.
- Loading skeletons, empty states, error states throughout.

---

## Decisions / open questions for you
1. **Quizzes, leaderboard, achievements** — these have **no backend** and are
   bigger features. Recommend deferring to **Phase 7 (post-launch)** and hiding
   those nav links at launch. Keep them in, or cut for now? *(I recommend defer.)*
2. **Course reviews & ratings** — there's an admin "reviews" page but no model.
   Add a simple student rating/review in this phase, or defer to Phase 7?
   *(I recommend a light 1–5 star + comment in S4, since teacher analytics already
   references "average rating".)*
3. **Free vs paid at launch** — Phase 3 makes **free** enrollment fully real.
   **Paid** unlocking depends on Phase 4 (Paystack). Confirm we ship free-course
   flow first, then layer payments on top.
4. **"Continue learning" granularity** — resume at the **lesson** level (simple,
   recommended) or remember exact video timestamp (more work)? *(I recommend lesson-level.)*

## What we will NOT do in this phase (and why)
- Real payments / paid unlocking → **Phase 4** (needs Paystack + webhook security).
- Quizzes / gamification → **Phase 7** (no backend; separate design).
- Email notifications (enrollment receipts etc.) → **Phase 5**.

## Definition of done (same bar as Phases 1 & 2)
- Every student page reads/writes the real API — the mock is deleted.
- Backend tests for enrollment, progress, completion → certificate issuance, and
  access control (a student can't see another student's progress; locked sections
  stay locked without enrollment).
- `npx tsc --noEmit` clean, build passes, full test suite green.

---

✍️ **Tell me what to add or remove, answer the 4 questions, then say "build S1"
and I'll start.**
