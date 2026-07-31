# Student Experience Blueprint

> What the student side of MooreSkillUp is meant to be, where it actually
> stands, and the sequence we'll follow to close the gap.
>
> Written 2026-07-31, after a full audit of every student-facing page and
> endpoint. Decisions in here are agreed with the owner — change them
> deliberately, not by accident.

## 1. The promise

A student should be able to:

**Land → sign up → be told what to learn → find it → buy it → learn it →
see themselves progressing → finish → hold a certificate they can prove.**

Every decision below serves that sentence. If a feature doesn't move a student
along that line, it waits.

## 2. Ground rules

These are non-negotiable and apply to every stage.

1. **Never ship placeholder data to a student.** No invented streaks, no fake
   assignments, no derived-looking numbers with no source. If the data isn't
   real yet, either build the source or mark the feature coming soon.
2. **Nothing in the navigation may lead nowhere.** A menu item is a promise.
3. **Every screen needs three states**: loading, empty, and error. The empty
   state matters most — a new student sees it first, and it must read as
   encouraging rather than broken.
4. **The server is the source of truth.** Progress, entitlement, and money are
   never decided by the client.
5. **This app is the logged-in product.** Marketing and discovery live on the
   separate MooreSkillUp marketing site, which routes people here.

## 3. Where we are

Audited 2026-07-31. 115 backend tests passing, tsc clean, build green.

| Step | Route | Status |
|---|---|---|
| Discover | `/` | 🟡 420 of 624 lines commented out |
| Register | `/auth/register` | 🟢 Real — 6-digit email OTP, 10-min expiry, resend timer |
| Login | `/auth/login` | 🟢 Real — JWT + session cookies, 2FA, device limits |
| Password reset | `/auth/forgot-password`, `/auth/reset-password` | 🟢 Real |
| Onboarding | tour component | 🟢 Exists |
| Dashboard | `/dashboard` | 🔴 Five widgets on hardcoded data |
| Browse | `/dashboard/courses` | 🟢 Real — 4 tabs, filters, sort, pagination |
| Course detail | `/course/[id]` | 🟢 Real — curriculum, reviews, preview vs locked |
| Checkout | `/payment/[id]`, `/payment/callback` | 🟢 Real Paystack, server-verified |
| Learn | `/lesson/[id]` | 🟢 Real — player, resume, notes, progress |
| Certificate | `/certificates`, `/verify/[code]` | 🟢 Real — auto-issued, PDF, public verification |
| Wishlist | — | 🔴 Backend and buttons exist, **no page** |
| Payments | `/dashboard/payments` | 🟢 Real |
| Notifications | `/notifications` | 🟢 Real |
| Support | `/support` | 🟢 Real |
| Settings | `/settings` | 🟢 Real — sessions, security, profile, avatars |
| Quiz Shop / Leaderboard / Achievements | — | 🔴 Coming soon, but shown in nav unconditionally |

**The spine is solid.** Registration through certificate genuinely works on real
data. What's broken is the edges.

### Known defects

1. **Wishlist heart is a 404.** `TopNavbar.tsx:20` links to `/courses?view=saved`;
   that route was deleted in Stage 1A. Students can save courses and never see
   them again.
2. **Dashboard widgets are fiction.** `LearningTracks`, `UpcomingTasks`,
   `DailyGoal`, `LearningStreak` render fixed arrays; `StatsGrid` computes
   learning hours as `inProgress * 2 + 3`.
3. **`LessonProgress.time_spent_seconds` is never written.** The field exists in
   the model and migration but no code sets it — always 0. This is the root
   cause of defect 2.
4. **Feature flags are served but never enforced.** The backend exposes them and
   Admin Settings toggles them, but the student pages ignore them.
   `src/lib/feature-flags.ts` works and is imported by nothing.
5. **Three of ten sidebar items are dead ends.**
6. **`/api/categories/` returns no course counts**, so track cards can't show
   real numbers.
7. **`Project` has no due date**, so projects can't appear in any upcoming view.

## 4. Decisions

Agreed with the owner. Recorded so we don't relitigate them.

| Decision | Choice |
|---|---|
| Daily goal target | **Student sets their own**, default 30 min, in `/settings` |
| Streak rule | **Any lesson activity** counts — the forgiving rule |
| Quiz Shop / Leaderboard / Achievements nav | **Hidden until the feature flag turns on** |
| Public browsing for logged-out visitors | **No.** Marketing site owns discovery |
| Landing page | Clean sign-in/sign-up gateway + certificate verification |
| Wishlist location | A **tab on `/dashboard/courses`**, not a new route |
| Assignment completion tracking | **Not possible** — submission is off-platform by design |
| Historical activity backfill | **Not possible** — counting starts at ship date |
| Build order | **Follow the student's journey**, front door first — not defect severity |
| Landing page content | **Pure gateway** — name, one line, sign in, create account, verify a certificate |
| Live students today | **None.** So shipping the time recorder at S4 rather than first costs nothing |

## 5. The roadmap

**We build in the order a student meets the product**, not in order of how badly
each part is broken. Front door, then the doors they walk through, then the room
they live in. Each stage is finished properly before the next begins.

### S1 — The front door (`/`)

*Goal: someone who lands here knows what this is and how to get in.*

- Delete the 420 commented-out lines — the page is 624 lines, two-thirds dead.
- Rebuild as a **pure gateway**: the MooreSkillUp name, one line on what it is,
  **Sign in**, **Create account**, **Verify a certificate**. Nothing else.
- No marketing copy, no pricing, no course browsing — the separate marketing
  site owns all of that and routes people here.
- Responsive, correct in light and dark, sane as a PWA launch screen.

**Done when:** a cold visitor lands and immediately knows what to do; nothing on
the page is commented out; every link works.

### S2 — Auth

*Goal: getting in is quick, clear, and never leaves you stuck.*

Covers register → 6-digit email OTP → login → forgot password → reset password.
The polish pass the old Stage 1B never received. These already work; this stage
is about whether they're *good*.

- Every error state says what to do next, not just what went wrong
- Loading and disabled states on every submit
- The OTP step: expiry, resend timer, wrong-code recovery, and what happens if
  you close the tab mid-flow
- Consistent layout across all five pages
- Mobile keyboards, autofill, and password managers behave

**Done when:** each of the five pages can be completed and failed gracefully on
desktop and mobile without a dead end.

### S3 — The shell

*Goal: the frame around every logged-in page is honest.*

- **Fix the wishlist 404** — `TopNavbar` links to a deleted route.
- **Feature-flag the sidebar** so Quiz Shop, Leaderboard and Achievements only
  appear when enabled. Wire `useFeatureFlags`; the hook already exists. Gate the
  pages too, so a direct URL can't reach a dead end.
- Onboarding tour: review what it actually says to a first-time student.
- Sidebar, top nav, avatar, notification badge — mobile behaviour.

**Done when:** every nav item leads somewhere real, and the Admin Settings
toggles visibly change what students see.

### S4 — Dashboard

*Goal: every number on the student's home screen comes from something real.*

**Backend**
- Write real time into `LessonProgress.time_spent_seconds`, computed
  **server-side** from the gap since `last_accessed_at` (never client-reported)
  and capped per ping so an idle tab can't inflate it.
- New `DailyActivity` model: one row per student per day holding minutes and
  lessons completed, written by the same progress ping. This is also the table
  Phase 7's XP system will read.
- Streak from consecutive `DailyActivity` dates, plus the seven-day bars.
- `daily_goal_minutes` on `StudentProfile`, default 30.
- Published-course counts on `/api/categories/`.
- New endpoint: upcoming assignments — `Task`s with a due date across the
  student's enrolled courses, soonest first. Projects excluded (no due date).
- Extend the dashboard payload with streak, today's minutes, goal, total hours
  and the week's activity.

**Frontend**
- Rewire `StatsGrid`, `LearningStreak`, `DailyGoal`, `LearningTracks`,
  `UpcomingTasks` to real data.
- Track cards click through to a filtered catalog — "View all" is dead text now.
- Real empty states on every widget.
- Daily goal control in `/settings`.

Starting point is branch `wip/student-dashboard`, which holds the redesign.

**Done when:** a brand-new student sees honest zeros with encouraging empty
states; completing a lesson visibly moves their minutes, streak and stats; no
component on the page contains a hardcoded data array.

### S5 — Courses

Browse, filters, sort, pagination, recommended — and the **wishlist tab**,
backed by the existing `/api/watchlist/` endpoint.

**Done when:** a student can find a course by any sensible route, and saved
courses are retrievable.

### S6 — Course detail and checkout

The buying decision: curriculum, free-preview vs locked, reviews, pricing and
discount, free enrolment, and the Paystack flow through to callback.

**Done when:** both a free enrolment and a real test-mode payment complete and
grant access.

### S7 — The lesson player

Where students spend the most time. Video, text, resource, assignment and
project lesson types; notes; resume position; progress; prev/next; completion.

**Done when:** a student can learn a full course start to finish, leave, and
come back exactly where they were.

### S8 — Completion

Reviews, certificate issue, PDF download, public verification.

**Done when:** finishing a course produces a certificate the student can
download and a stranger can verify.

### S9 — Account

Notifications, payments history, support tickets, settings, avatars, sessions.

### S10 — Growth features (Phase 7)

XP, quizzes, leaderboard seasons, badges. Built on the `DailyActivity` table
from S4. Deliberately last: worthless on a broken core, excellent on a solid one.

## 6. Explicitly out of scope

- Public/logged-out course browsing — the marketing site's job
- In-app assignment submission or grading — off-platform by design
- Uploaded course images — gradient/category visuals instead, by decision
- Backfilling historical learning activity — impossible, and we say so plainly
