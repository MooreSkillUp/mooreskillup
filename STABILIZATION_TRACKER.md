# Stabilization Tracker

> Pre-deployment fix pass across Phases 1–5. We fix everything here before
> Phase 6 (deploy). Add issues freely — check them off as we resolve them.

## 🔴 HIGH — functional gaps (real users hit these)

- [ ] **Public catalog `/courses` shows FAKE courses.** It renders `academyPrograms`
      mock data, not your real published courses. This is the public storefront a
      visitor sees before signing up. → Wire to `/api/courses/` (endpoint already exists).
- [ ] **Public landing `/` "Browse courses" path** should lead to the real catalog
      (verify the CTA + that a logged-out visitor can browse real published courses).

## 🟡 MEDIUM — cleanup / consistency

- [ ] **Duplicate/orphan routes** (reachable by accident, may show stale UI):
      `/login` & `/register` (dupe of `/auth/login`, `/auth/register`),
      `/quiz-shop` (dupe of `/dashboard/quiz-shop`), `/teacher/upload`
      (dupe of `/teacher/create-course`). → Delete or redirect.
- [ ] **Dead component** `src/components/dashboard/AnnouncementPanel.tsx` — unused → delete.
- [ ] **Taxonomy fallback to mock-data** in a few pages (admin/teachers, auth/register,
      settings) — uses `trackOptionsByInterest` from mock-data as fallback instead of
      always the live API taxonomy. Works, but can drift from real categories.

## 🟢 LOW — nitpicks

- [ ] `/teacher/uploads` is a thin "recent activity" page — confirm it's still wanted.
- [ ] Misc `mock-data` imports that are only TYPES/constants (Interest, UserRole) —
      harmless; leave unless we want a full cleanup.

## ✍️ Owner's observations (your list — what you've seen not working)

> Add anything here — even rough: "on X page, Y button does nothing", "Z looks broken",
> "this flow errored". UX/visual issues I can't see from code go here.

- [ ] _(add yours)_

---

## What I cannot detect from code (need your eyes)
- Visual / layout / spacing issues
- Buttons that run but don't do what you expect
- Flows that only break with real data or timing
- Role-specific glitches you've hit while clicking around
