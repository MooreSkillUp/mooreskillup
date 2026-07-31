# Stabilization Tracker

> Open issues on the road to launch. Add freely — check off as we resolve them.
>
> Last full audit: **2026-07-31** (115 backend tests passing, tsc clean, build green)

## ✅ Resolved

- ~~Public catalog `/courses` shows fake courses~~ — the page was deleted in
  Stage 1A; the real catalog lives at `/dashboard/courses`.
- ~~Duplicate/orphan routes (`/login`, `/register`, `/quiz-shop`,
  `/teacher/upload`)~~ — deleted in Stage 1A.
- ~~Dead component `AnnouncementPanel.tsx`~~ — deleted in Stage 1A.
- ~~`mock-data.ts` and the dead mock libraries~~ — deleted in Stage 0. Real
  types and taxonomy fallbacks moved to `src/lib/taxonomy-types.ts`.
- ~~CI never ran the test suite~~ — CI now runs pytest, ruff, the migration
  check, and `tsc --noEmit` as merge gates.

## 🔴 HIGH — functional gaps (real users hit these)

- [ ] **Student dashboard widgets render hardcoded data.** `LearningTracks`,
      `UpcomingTasks`, `DailyGoal` and `LearningStreak` ship fixed arrays, and
      `StatsGrid` fakes learning hours as `inProgress * 2 + 3`. Every student
      sees the same invented streak and the same three fake assignments.
      → Stage 1. Work is parked on branch `wip/student-dashboard`.
- [ ] **`LessonProgress.time_spent_seconds` is never written.** The field exists
      in the model and migration but no code sets it, so it is always 0. This is
      why learning hours had to be faked. → Stage 1.
- [ ] **Feature flags are served but not enforced on the student pages.**
      `/achievements`, `/leaderboard` and `/dashboard/quiz-shop` render a
      hardcoded `ComingSoonPanel` and never read the flags. The backend exposes
      them and Admin Settings can toggle them, but toggling has no effect.
      `src/lib/feature-flags.ts` (`useFeatureFlags`) is written and working but
      imported by nothing. → wire the pages to it.

## 🟡 MEDIUM — cleanup / consistency

- [ ] **Taxonomy fallback constants** (`FALLBACK_INTERESTS`,
      `FALLBACK_TRACKS_BY_INTEREST` in `taxonomy-types.ts`) are used by
      `auth.tsx`, `/settings` and the register/admin forms instead of always
      using the live API taxonomy. Works, but drifts from real categories as
      admins add them. → decide: keep as a genuine offline fallback, or remove.
- [ ] **Tests run on SQLite, production runs PostgreSQL.** `config/settings/test.py`
      uses in-memory SQLite, so Postgres-specific behaviour is never exercised —
      notably `select_for_update` in `fulfill_payment`, which SQLite ignores.
      → consider a Postgres CI job for the payments suite.
- [ ] **`Project` has no due date**, so projects cannot appear in any
      "upcoming work" view. Only `Task.due_date` exists. → add if projects
      should carry deadlines.
- [ ] **`/api/categories/` returns no course counts**, so category/track cards
      cannot show how many courses each holds without extra requests. → Stage 1.

## 🟢 LOW — nitpicks

- [ ] `/teacher/uploads` is a thin "recent activity" page — confirm it's wanted.
- [ ] ~19 unused shadcn UI primitives in `src/components/ui/` (accordion,
      carousel, menubar, …). Normal for a component library — left in place
      deliberately. Remove only if you want a minimal bundle.
- [ ] No pre-commit hooks. CI is the real gate; hooks would only shorten the
      feedback loop. → optional.

## ✍️ Owner's observations (your list — what you've seen not working)

> Add anything here — even rough: "on X page, Y button does nothing", "Z looks
> broken", "this flow errored". UX/visual issues I can't see from code go here.

- [ ] _(add yours)_

---

## What I cannot detect from code (need your eyes)

- Visual / layout / spacing issues
- Buttons that run but don't do what you expect
- Flows that only break with real data or timing
- Role-specific glitches you've hit while clicking around
