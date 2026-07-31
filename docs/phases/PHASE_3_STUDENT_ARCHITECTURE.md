# Phase 3 — Student Workspace: Architecture & Implementation Brief

> Full redesign of the student experience to Udemy / Coursera / LinkedIn
> Learning standards, tailored to MooreSkillUp's track-based ecosystem.
> The current student workspace (the `teacher-workspace.tsx` localStorage mock)
> is **replaced**, not preserved. Built milestone by milestone, each verified
> green (tests + `tsc`), same as Phases 1 & 2.

## Locked decisions (from the founder)
- **Avatars:** students pick from a **预set library** (male / female / neutral /
  professional) — **no custom photo uploads**. Plus display name, interests, track, optional bio.
- **Resume:** lesson-level resume **and** video timestamp resume, cross-device (server-stored).
- **Reviews & ratings:** included at launch. Only students who **completed or
  significantly progressed (≥50%)** can review. Admin moderation (hide/restore).
- **Payments:** **Paystack only.** Remove OPay entirely. Flow: Course → Checkout →
  Paystack → Enrollment → Access. (Real gateway wiring is Phase 4; checkout shell + OPay removal now.)
- **Quiz Shop / Leaderboard / Achievements:** **"Coming Soon"** at launch, but
  **architecture built now** and controlled by **admin feature flags** (enable/disable/launch later).
- **Notifications:** never show notification IDs in the UI; mark read / mark all / delete / clear all.
- **Certificates:** the Phase-2 engine (auto-issue on completion, `MSU-XXXX`,
  public `/verify/<code>`); student downloads a PDF. (Designer's certificate art comes later.)
- **Recommendations:** track-based + teacher/admin can mark a course "recommended."
- Everything admin-controllable via **centralized feature flags** in platform settings.

---

## 1. Information Architecture (student navigation)

```
Student
├── Dashboard            (overview, continue learning, recommended, recent activity)
├── My Courses           (personal library: enrolled / in-progress / completed)
├── Browse Courses       (discovery with filters)
├── All Courses          (every published course: search + filter + sort + paginate)
│     └── Recommended    (track-based + instructor/admin picks — a tab/section)
├── Course Details       (public landing page → checkout)
├── Lesson Player        (video/text/resource/assignment/project + notes + progress)
├── Certificates         (earned certificates + PDF download + verify link)
├── Notifications        (clean list, no IDs)
├── Quiz Shop            (Coming Soon — flag-gated)
├── Leaderboard          (Coming Soon — flag-gated)
├── Achievements         (Coming Soon — flag-gated)
└── Settings             (profile, avatar, notifications, security, learning prefs)
```

**Course discovery model (clears the current scatter):**
- **My Courses** = the student's library — only courses they're enrolled in (purchased or free), grouped: *In progress · Not started · Completed*.
- **Browse Courses** = discovery, filter by Category · Track · Level · Instructor · Price · Tags.
- **Recommended** = published courses in the student's selected tracks, plus any course a teacher/admin flagged "recommended," ranked.
- **All Courses** = every published course, with search + filters + sort + pagination.

## 2. Key user flows
- **Discover → Buy → Learn:** Browse/All → Course Details (sections, free previews, price) → Checkout → Paystack → Enrollment → Lesson Player.
- **Free course:** Course Details → Enroll (one click) → Lesson Player.
- **Resume:** Dashboard "Continue Learning" → jumps to last lesson at last video position.
- **Complete → Certify:** finish all lessons → course 100% → certificate auto-issued → download PDF / share verify link.
- **Review:** completed/≥50% course → leave 1–5★ + comment → appears on course page (after moderation rules).

## 3. Database design (new / changed models)
- **PlatformSettings** (extend): feature flags — `feature_reviews_enabled`,
  `feature_certificates_enabled`, `feature_recommendations_enabled`,
  `feature_achievements_enabled`, `feature_leaderboard_enabled`, `feature_quiz_enabled`.
- **CourseReview** (new): course, student, rating 1–5, comment, status (published/hidden), timestamps; unique (course, student); create gated by enrollment + progress ≥50% or completed.
- **LessonNote** (new): enrollment, lesson, content, updated_at; unique (enrollment, lesson).
- **LessonProgress** (extend): `last_position_seconds` for video resume.
- **Course** (extend): `is_recommended` flag (teacher/admin sets).
- **Avatars:** a fixed catalogue (frontend assets); the chosen key stored on the user (`avatar_url`/avatar field). No upload pipeline.
- **Subscriptions:** lightweight `SubscriptionPlan` + `StudentSubscription` scaffolding for future growth (not user-facing at launch).

## 4. API design (new endpoints)
- `GET /api/platform/status/` → now also returns the feature-flag set (public, for "coming soon").
- `GET /api/courses/?category=&track=&level=&price=&search=&sort=&page=` → filtered/paginated catalog.
- `GET /api/courses/recommended/` → track + flagged recommendations (auth, student).
- `GET /api/courses/<id>/reviews/` · `POST /api/courses/<id>/reviews/` (eligibility-checked) · admin `PATCH` to moderate.
- `GET/PUT /api/lessons/<id>/note/` → per-lesson notes.
- `POST /api/progress/lessons/<id>/` (extend) → accepts `position_seconds`.
- `GET /api/avatars/` → the predefined avatar catalogue.
- Admin: `PATCH /api/admin/settings/` already there → now carries feature flags.

## 5. Frontend structure
- New `src/lib/student.ts` (catalog, my-courses, enrollment, progress, recommendations) replacing `teacher-workspace.tsx` consumption.
- New `src/lib/reviews.ts`, `src/lib/notes.ts`, `src/lib/feature-flags.ts` (reads public status).
- Rebuilt pages: `/dashboard`, `/dashboard/courses` (tabs), `/courses` (catalog), `/course/[id]` (details), `/lesson/[id]` (player), `/certificates`, `/notifications`, `/settings`.
- Every page ships **loading / empty / error** states. Adopt **TanStack Query** (already installed) for caching/refetch.

## 6. Backend structure
- Reuse existing apps: `courses` (catalog, reviews, recommend), `enrollments`, `progress` (notes, resume), `certificates`, `platform` (flags). No payment changes beyond removing OPay until Phase 4.

## 7. Admin controls (centralized feature flags)
Admin → Settings gains a **"Student features"** card: toggle Reviews, Certificates,
Recommendations, and the three "Coming Soon" features (Achievements, Leaderboard,
Quiz Shop). Flags are read by the frontend from the public status endpoint, so a
disabled feature shows "Coming Soon" (or hides) instantly, platform-wide.

## 8. Feature flags
One source of truth (PlatformSettings). Public read for the UI; Super-Admin write.
Frontend `useFeatureFlags()` hook gates nav items and pages.

## 9. Deployment readiness
- Catalog list endpoints **paginated** (no full-table dumps).
- Server-enforced access control (locked sections never leak content without enrollment).
- Loading/empty/error states; optimistic UI where safe.
- Tests for enrollment, progress/resume, review eligibility, flag gating, access control.
- OPay removed; Paystack-only checkout shell ready for Phase 4 wiring.

## 10. Step-by-step implementation roadmap
| # | Milestone | Delivers |
|---|---|---|
| **S0** | Foundation (backend) | Feature flags + admin toggles; CourseReview, LessonNote, progress-resume, `is_recommended` models; migrations + tests |
| **S1** | Course discovery (UI) | My Courses / Browse / Recommended / All Courses — filters, search, sort, pagination, professional UI; real API |
| **S2** | Course details page | Udemy-style landing: sections, free preview, pricing, instructor, purchase CTA → checkout shell |
| **S3** | Lesson player | video/text/resource/assignment/project + notes + progress resume + course updates |
| **S4** | Dashboard + profile + settings | Continue-learning, recommended, recent activity; predefined avatars; notification cleanup (no IDs); learning prefs |
| **S5** | Reviews + completion + certificate download | ratings UI (eligibility), completion tracking, PDF certificate + verify |
| **S6** | Coming-soon + checkout shell | Quiz/Leaderboard/Achievements flag-gated "Coming Soon"; Paystack checkout shell; remove OPay |
| **S7** | Cleanup & polish | delete `teacher-workspace.tsx` mock; TanStack Query; loading/empty/error everywhere |

> Real Paystack charge + webhook verification is **Phase 4** (security-critical).
> S2/S6 build the checkout UI and enrollment-on-success path so Phase 4 just wires the gateway.

---
**Building now:** S0 (foundation), then S1 onward. Each milestone ends green.
