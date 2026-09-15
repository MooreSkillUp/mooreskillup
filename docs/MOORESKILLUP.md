# MooreSkillUp

What this platform is, what is built, what is not, and how the pieces fit
together. Written after an end-to-end audit of the student experience on
2026-08-19.

If you read one thing before making a decision about this codebase, read
§2 (What exists) and §7 (What is not built).

---

## 1. What MooreSkillUp is

An online learning platform where students take structured courses, track their
progress, and earn certificates they can prove. Built for a Nigerian audience:
Naira pricing through Paystack, WhatsApp communities, and a region chosen for
latency rather than habit.

Three roles share one system:

| Role | What they do |
|---|---|
| **Student** | Enrol, learn, take quizzes, earn certificates |
| **Teacher** | Build courses, schedule live sessions, see their students |
| **Admin** | Approve courses, manage people and payments, run the platform |

**A guiding rule that shaped most decisions in here:** never show a student a
number the system cannot actually justify. Several features exist in their
current shape because the honest version was harder than the invented one.

---

## 2. What exists

### The stack

| Layer | Choice | Where it runs |
|---|---|---|
| Frontend | Next.js 15, React 19, Tailwind 4, TypeScript | Vercel |
| Backend | Django 5.2, Django REST Framework | Azure Container Apps |
| Database | PostgreSQL 16 | Azure Flexible Server |
| Files | Blob Storage (uploads), WhiteNoise (static) | Azure |
| Email | Brevo via django-anymail | — |
| Payments | Paystack, server-verified | — |
| Auth | JWT access + refresh, server-side sessions | — |
| Deploys | GitHub Actions → Azure, gated on tests | — |

**Cost: roughly $25/month**, almost entirely the database. The API scales to
zero, so an idle platform costs nothing to run.

### The student journey, end to end

Every step below is built, wired to real data, and verified against the running
application — not just against tests.

**1 · Front door** (`/`)
A gateway, not a marketing page: sign in, create an account, verify a
certificate. Doubles as the PWA launch screen and redirects anyone already
signed in straight to their dashboard.

**2 · Registration** (`/auth/register`)
Email, password, **real first and last name**, then a 6-digit code emailed to
prove the address works. The name is collected here rather than later because a
certificate carrying a username is worthless to the person holding it.

**3 · Sign in** (`/auth/login`)
JWT plus a server-side session record. Optional two-factor by email. Up to five
devices at once. Deep links survive the detour — bounced to sign in from a
course, you land back on that course.

**4 · The shell**
Sidebar, top bar, notifications, account menu. Nav items that depend on
unfinished features are hidden behind feature flags a Super Admin controls, so
nothing in the navigation leads nowhere.

**5 · Dashboard** (`/dashboard`)
A brand banner with the student's real figures, then **Continue Learning** as
the headline — the single next thing to do. Alongside it: today's minutes
against a goal they set, their streak, the week behind them, what is coming up,
and how close the next certificate is.

A student with nothing enrolled gets **one** invitation rather than five empty
cards apologising separately.

**6 · Finding a course** (`/dashboard/courses`)
Five tabs — My Courses, Saved, Browse, Recommended, All — with search, filters,
sorting and pagination. Recommendations lead with the student's own track.

**7 · The course page** (`/course/[id]`)
Curriculum with real durations and per-section progress, reviews, and a purchase
panel. Locked lessons stay **visible**: seeing what you would get is the argument
for buying. Preview lessons are badged and openable without enrolling.

**8 · Paying** (`/payment/[id]`)
Paystack in Naira. Verified server-side on return — the browser is never trusted
to say a payment succeeded.

**9 · Learning** (`/lesson/[id]`)
Video, text or resource lessons. Curriculum sidebar with the current section
open. Progress for that section rather than the whole course. Resume position on
video. A 60-second heartbeat records study time **server-side**, capped per ping
and paused when the tab is hidden.

**10 · Quizzes** (`/quiz/[id]`)
One question at a time. Questions drawn from a pool larger than any attempt, so
retries cannot be memorised. Fifteen-minute cooldown after a failure, never
after a pass. Scored on the server; the answer key is disclosed only once an
attempt is closed, with an explanation for every question.

**11 · Finishing**
Every section complete, plus the final assessment at its pass mark. Then the
certificate issues and an email goes out — including when a course has no
certificate, where it says so plainly.

**12 · The certificate** (`/certificates`)
Generated in the browser on download, so nothing is stored and no storage is
paid for. Carries the student's real name, the course, the track, the date, a
unique ID and a QR code to the public verification page. Courses still in
progress appear **blurred** with the student's name already on them.

**13 · Everything else**
Payment history, notifications, support tickets, a schedule of live sessions,
and settings covering profile, name, daily goal, avatar, password, two-factor
and active sessions.

---

## 3. How the important parts work

### Learning time
`LessonProgress.time_spent_seconds` existed from the first migration and nothing
ever wrote to it, so every "hours learned" figure was invented. Now the player
sends a heartbeat every 60 seconds and the server banks the gap since the last
one, **capped at 120 seconds per ping**. An idle overnight tab earns two
minutes, not eight hours, and an honest student loses nothing.

`DailyActivity` holds one row per student per day. Streaks, the daily goal, the
weekly bars and lifetime hours all read from it — one source, so the dashboard
cannot contradict itself. Seconds accumulate rather than being recomputed, which
means **a finished day stays finished**: reopening last Tuesday's lesson does
not rewrite last Tuesday.

It counts from the day it shipped. History cannot be reconstructed, and the UI
says so rather than pretending.

### Progression
Per course, chosen by the teacher:

- **Open** (default) — any section, once enrolled
- **Sequential** — a section unlocks when the previous one is finished: its
  lessons done, and its quiz passed if the teacher set one

Three safeguards, because this is where students get stranded:

1. A section **without** a quiz completes on lessons alone — nothing gates by
   accident
2. An **unready** quiz (published but empty, or a question with no correct
   answer) is treated as absent rather than as a locked door
3. Sections already completed stay open, so switching a live course to
   sequential never takes back ground a student covered

### What can and cannot gate
Assignments and projects are submitted **off-platform** — WhatsApp, Google
Forms — which is deliberate: it is what makes the community work. It also means
the platform cannot verify them, so they are shown, encouraged and celebrated,
but **never block anything**.

Quizzes are answered here, so they carry the gates. The certificate rests on
something the system can actually check.

### Sessions
Access tokens live in memory; refresh tokens in an httpOnly cookie, with a
localStorage fallback while the API and frontend sit on different domains.
See §7 — this is temporary.

---

## 4. Where things live

```
backend/apps/
  accounts/      users, profiles, sessions, 2FA, registration
  categories/    programmes and tracks
  courses/       courses, sections, lessons, tasks, projects, reviews
  enrollments/   who has access to what, plus the watchlist
  progress/      lesson progress, daily activity, dashboards
  quizzes/       quizzes, questions, attempts, progression rules
  certificates/  issuance and public verification
  payments/      Paystack
  notifications/ in-app notifications, broadcasts, support tickets
  schedule/      live classes and events
  platform/      settings, feature flags, audit log, the demo seeder

src/
  app/           routes (Next.js App Router)
  components/    UI, grouped by area
  lib/           data hooks and API clients — one file per domain
```

**Two rules worth keeping:** one component per concept, not one per role — the
same `CourseBanner` draws a student card, a teacher preview and an admin row, so
fixing it once fixes it everywhere. And every screen needs three states: loading,
empty, and error, with the empty state written as a starting point rather than
an apology.

---

## 5. Running it

```bash
docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_demo
```

The seeder builds 3 categories, 6 published courses with sections, lessons and
quizzes, 4 students at different stages, real progress, streaks, certificates
and scheduled events. **It refuses to run against production** — three
independent guards, both verified.

| Account | State |
|---|---|
| `ada@demo.mooreskillup.test` | 4 courses, a certificate, a streak |
| `tunde@demo.mooreskillup.test` | midway |
| `chioma@demo.mooreskillup.test` | just started |
| `emeka@demo.mooreskillup.test` | nothing — the first-run screen |
| `teacher@demo.mooreskillup.test` | owns every demo course |

Password for all: `DemoPass123!` · Reset with `seed_demo --wipe`.

---

## 6. Audit results

Verified 2026-08-19 against the running application.

| Area | Result |
|---|---|
| 27 student routes | All render, no console or page errors |
| 15 student API endpoints | All 200 |
| Quiz scoring | 4/4 correct → 100%, passed |
| Sequential gate | Lessons done + quiz unpassed → still locked ✅ |
| Certificate gate | Sections done + final unpassed → not earned ✅ |
| Certificate issuance | Issued on passing, email sent ✅ |
| Placeholder data reaching students | **None** |
| Dead code | None (two orphans removed during the audit) |
| Nav items without a page | None |
| Backend tests | 192 passing |
| ruff / typecheck / lint / build | Clean |

**Found and fixed during the audit:** every page load began with three
guaranteed 401s before the token refresh caught up; the lesson player still told
students to "save notes as you go" after notes were removed; `SectionAccordion`
was orphaned.

---

## 7. What is not built

Honest list. Nothing here is hidden behind a "coming soon" that implies
otherwise — the flags keep unfinished features out of the navigation entirely.

### Blocking nothing today, but needed

**Teacher quiz authoring.** The API is complete and Django admin works, so
quizzes can be created — but there is no screen in the teacher studio.

**Teacher Studio.** The course builder works but is a single long form. The
planned rebuild is a six-step wizard with live preview and a completion
checklist.

**Video hosting.** Currently YouTube, Vimeo or direct files. **Unlisted YouTube
is not private** — one shared link and a paid course is free. Decision taken:
Cloudflare Stream with expiring signed links, Vimeo as the alternative. Not yet
built.

### Deliberately deferred

**Quiz Shop, leaderboard, achievements.** Flag-hidden. They need a currency, and
a currency needs quizzes generating activity first.

**Staging environment.** One environment on purpose — a second database is ~$20
a month to protect a platform with no students on it yet.

**Public course browsing.** The marketing site owns discovery; this app is the
logged-in product.

### Known limitations

**The session fallback is temporary.** The frontend and API sit on different
domains, which makes the auth cookie third-party — blocked by Safari, dying in
Chrome. A refresh token in `localStorage` covers the gap, which is readable by
any script on the page. **The real fix is one domain**: `app.mooreskillup.com`
and `api.mooreskillup.com`, at which point the cookie becomes first-party and
the fallback is deleted.

**Assignment completion cannot be tracked.** Off-platform by design.

**Activity has no history.** Counting began the day the recorder shipped.

**Tests run on SQLite, production on PostgreSQL.** `select_for_update` in
payment fulfilment is never exercised by the suite.

**No frontend tests.** The backend has 192; the frontend has none. Verification
there is typecheck, lint, build, and driving the real app.

---

## 8. Suggestions

Ordered by what I would do first.

### Before launch — non-negotiable

1. **Get the domain.** It fixes the session problem properly, lets the
   localStorage fallback be deleted, and you need it anyway. Roughly an hour of
   DNS work.

2. **Move off the Visual Studio subscription.** Its credit is licensed for
   dev/test only — not production. Same Terraform, different subscription id.

3. **Set `min_replicas = 1`.** Scale-to-zero saves money but costs a 10–30
   second cold start. Nobody should meet that at a login screen.

4. **Decide video hosting and build it.** The moment you sell a course, an
   unlisted YouTube link is a hole in your revenue.

### Soon after

5. **Frontend tests for the money and access paths** — enrolment, payment
   callback, progression gates. The backend is well covered; the frontend is
   not, and those three are where a silent break costs you.

6. **Error tracking.** Application Insights is provisioned but nothing reports
   to it. Right now a student hitting an error is a student you never hear about.

7. **Watch the first sequential course closely.** It is the feature most likely
   to strand somebody. Start with one course, not all of them.

### Structurally, as the platform grows

8. **Keep the "no invented data" rule.** Nearly every bug found across this work
   was the same shape: the interface claiming something the data could not back.
   A fake streak, a wishlist with no page, "0 lessons" on courses that had
   lessons, a certificate resting on a button click. The rule is cheap to hold
   and expensive to abandon.

9. **One component per concept.** Already true for course banners and cards.
   Worth defending as teacher and admin screens grow, or you will end up fixing
   the same bug three times.

10. **There are two copies of the authenticated-request logic** — one in
    `authenticated-api.ts`, one inside `auth.tsx`. They have already drifted
    once. Worth collapsing before a third appears.

11. **Build teacher and admin the way the student side was built:** follow the
    journey in order, make each screen honest before making it pretty, and look
    at the running app rather than trusting a green build. Most of the real bugs
    in this work were found by looking, not by testing.
