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

## 5. The roadmap

### S1 — The dashboard tells the truth

*Goal: every number on the student's first screen comes from something real.*

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
- Track cards click through to a filtered catalog — "View all" is currently dead
  text.
- Real empty states on every widget.
- Daily goal control in `/settings`.

**Done when:** a brand-new student sees honest zeros with encouraging empty
states; a student who completes a lesson sees their minutes, streak and stats
move; no component on the page contains a hardcoded data array.

### S2 — Close the leaks

*Goal: nothing in the student UI promises something it can't deliver.*

- **Wishlist tab** on `/dashboard/courses`, backed by the existing
  `/api/watchlist/` endpoint. Fix the TopNavbar heart to point at it.
- **Feature-flag the sidebar** so Quiz Shop, Leaderboard and Achievements only
  appear when enabled. Wire `useFeatureFlags` — the hook already exists.
  Flag-gate the pages themselves too, so a direct URL can't reach a dead end.
- **Landing page**: delete the 420 commented-out lines; leave a clean gateway —
  sign in, sign up, verify a certificate.

**Done when:** every student nav item leads somewhere real; saved courses are
retrievable; the Admin Settings toggles visibly change what students see.

### S3 — Walk the journey end to end

*Goal: prove the whole thing works on real data, not just in isolation.*

Register → verify email → onboard → browse → open a course → enrol free →
pay for a paid one → learn → take notes → resume → complete → review → collect
the certificate → verify it publicly. Both a free and a paid course, on desktop
and on mobile/PWA.

This stage **needs the owner clicking**. Code review can prove data flows; it
cannot tell us a button is in the wrong place or a flow feels clumsy.

**Done when:** the owner can complete the full journey twice without hitting
anything broken or confusing.

### S4 — Polish the learning experience

*Goal: make the part students spend the most time in genuinely good.*

Scope set after S3, from what we actually find. Candidates: lesson player
details, note-taking quality, mobile/PWA behaviour, the review prompt at
completion, notification usefulness.

### S5 — Growth features (Phase 7)

XP, quizzes, leaderboard seasons, badges. Built on the `DailyActivity` table
from S1. Deliberately last: they are worthless on top of a broken core, and
excellent on top of a solid one.

## 6. Explicitly out of scope

- Public/logged-out course browsing — the marketing site's job
- In-app assignment submission or grading — off-platform by design
- Uploaded course images — gradient/category visuals instead, by decision
- Backfilling historical learning activity — impossible, and we say so plainly
