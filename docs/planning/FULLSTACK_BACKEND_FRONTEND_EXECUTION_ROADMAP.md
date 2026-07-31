# Fullstack Backend + Frontend Execution Roadmap

This roadmap is the practical build order for More SkillUp.

It is not just "build backend."

It tells us:

- what to build first
- what to connect first
- what to test before moving on
- how backend and frontend should meet
- what "done" means for each phase

The goal is to avoid building everything at once and ending up with a broken system.

We will build in slices.

Each slice must follow this order:

1. backend structure for that feature
2. backend API
3. test backend alone
4. connect frontend to that API
5. test frontend + backend together
6. fix issues
7. move to the next slice

---

## 1. Core Working Principle

Do not connect the whole frontend to the whole backend at once.

That is the fastest way to get stuck.

Instead, use this rule:

- build one backend feature
- connect one frontend feature
- test it
- stabilize it
- then move forward

That means the build order should be:

1. Auth
2. Categories
3. Course browsing
4. Teacher course creation
5. Enrollment and watchlist
6. Payments
7. Progress tracking
8. Notifications
9. Certificates
10. Full QA and cleanup

---

## 2. Overall Build Phases

### Phase 0: Environment and Foundation

Goal:

- backend can run
- frontend can still run
- both projects know where each other are

What to do:

- make sure backend folder structure is stable
- install Python or use Docker
- create backend `.env`
- run Django server
- run PostgreSQL
- make sure frontend has `NEXT_PUBLIC_API_URL`

Done means:

- backend server starts
- frontend server starts
- backend `/api/` routes are reachable

---

### Phase 1: Authentication

Goal:

- replace mock auth with real auth

Backend work:

- user model
- teacher profile
- student profile
- register endpoint
- login endpoint
- refresh endpoint
- current user endpoint
- password reset request
- password reset confirm

Frontend work:

- replace `src/lib/auth.tsx` mock login/register logic with API calls
- store tokens
- load user from `/api/auth/me/`
- update route redirects based on real role

Files affected on frontend:

- [src/lib/auth.tsx](C:/TECH/Dev/mooreskillup/src/lib/auth.tsx)
- [src/app/auth/login/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/login/page.tsx)
- [src/app/auth/register/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/register/page.tsx)
- [src/app/auth/forgot-password/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/forgot-password/page.tsx)
- [src/app/auth/reset-password/page.tsx](C:/TECH/Dev/mooreskillup/src/app/auth/reset-password/page.tsx)

Test checklist:

- register student
- login student
- login teacher
- login admin
- refresh token works
- protected route works
- logout works
- forgot/reset password works

Done means:

- mock auth is no longer the source of truth
- frontend user session comes from backend

---

### Phase 2: Categories and Subcategories

Goal:

- category system becomes real

Backend work:

- create category and subcategory tables
- admin create/update/delete category endpoints
- public category listing endpoint

Frontend work:

- replace category mock usage in teacher creation/edit flow
- replace category mock usage in browse filters

Files affected:

- teacher course creation pages
- admin category pages
- any course form that depends on categories

Test checklist:

- admin creates category
- admin creates subcategory
- frontend teacher form loads them correctly
- subcategory always belongs to correct category

Done means:

- category data is fully backend-driven

---

### Phase 3: Public Course Browsing

Goal:

- students can browse real course data from backend

Backend work:

- course list endpoint
- course detail endpoint
- pricing and ownership flags
- free/paid section lock logic

Frontend work:

- replace mock discoverable courses
- replace mock course preview page data
- render real `isOwned`, `isInWatchlist`, `cta`, `isLocked`, `isFree`

Files affected:

- [src/app/course/[id]/page.tsx](C:/TECH/Dev/mooreskillup/src/app/course/[id]/page.tsx)
- [src/app/dashboard/courses/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/courses/page.tsx)
- [src/app/dashboard/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/page.tsx)
- [src/components/dashboard/CourseCard.tsx](C:/TECH/Dev/mooreskillup/src/components/dashboard/CourseCard.tsx)

Test checklist:

- free course shows start/open state correctly
- paid course shows unlock state correctly
- owned paid course shows open state correctly
- locked sections are really locked
- free preview sections are visible

Done means:

- course catalog and preview pages use backend data

---

### Phase 4: Teacher Course Management

Goal:

- teachers create and manage real courses

Backend work:

- teacher create course
- teacher update course
- teacher add section
- teacher add lesson
- teacher add task
- teacher set pricing
- teacher publish course
- teacher list own courses

Frontend work:

- connect teacher dashboard and teacher course editor to backend
- replace local workspace course persistence with API persistence

Files affected:

- teacher course pages
- teacher workspace state layer
- upload/create/edit flows

Test checklist:

- teacher creates draft
- teacher edits draft
- teacher adds sections
- teacher adds lessons
- teacher adds tasks
- teacher sets price
- teacher publishes
- published course appears in student discovery

Done means:

- teacher content no longer depends on local mock storage

---

### Phase 5: Enrollments and Watchlist

Goal:

- student ownership and saved courses become real

Backend work:

- enrollment model and endpoints
- watchlist add/remove/list endpoints
- my courses endpoint

Frontend work:

- replace local watchlist state with backend
- replace owned course logic with backend
- replace purchased/my-courses logic with backend

Files affected:

- [src/lib/auth.tsx](C:/TECH/Dev/mooreskillup/src/lib/auth.tsx)
- [src/lib/teacher-workspace.tsx](C:/TECH/Dev/mooreskillup/src/lib/teacher-workspace.tsx)
- dashboard course tabs

Test checklist:

- add to watchlist
- remove from watchlist
- watchlist survives reload
- my courses shows enrolled courses only
- ownership rules update correctly

Done means:

- watchlist and owned course state come from database

---

### Phase 6: Payments

Goal:

- paid course unlocking becomes real

Backend work:

- initialize payment
- create payment record
- create transaction record
- verify payment
- webhook processing
- create enrollment after success

Frontend work:

- connect checkout page to payment initialize endpoint
- redirect to payment provider or mock sandbox flow
- after success, refetch course and payment state

Files affected:

- [src/app/payment/[id]/page.tsx](C:/TECH/Dev/mooreskillup/src/app/payment/[id]/page.tsx)
- [src/app/dashboard/payments/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/payments/page.tsx)
- [src/app/dashboard/courses/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/courses/page.tsx)

Test checklist:

- initialize paystack payment
- initialize opay payment
- payment record created
- verify endpoint marks success
- enrollment created after success
- course unlocks immediately after success
- payments page shows transaction history

Done means:

- paid course unlock is backend-driven

---

### Phase 7: Progress Tracking

Goal:

- lesson completion and course progress become real

Backend work:

- lesson progress endpoint
- course progress endpoint
- continue learning dashboard payload
- last accessed lesson logic

Frontend work:

- replace local completion logic
- replace local last lesson tracking
- replace local dashboard progress cards

Files affected:

- [src/app/lesson/[id]/page.tsx](C:/TECH/Dev/mooreskillup/src/app/lesson/[id]/page.tsx)
- [src/app/dashboard/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/page.tsx)
- [src/app/dashboard/courses/page.tsx](C:/TECH/Dev/mooreskillup/src/app/dashboard/courses/page.tsx)

Test checklist:

- open lesson updates last accessed
- mark complete updates lesson progress
- course progress percentage updates
- continue learning points to correct lesson
- dashboard progress matches backend

Done means:

- learning continuity is fully backend-driven

---

### Phase 8: Notifications

Goal:

- notifications become real

Backend work:

- user notification listing
- admin broadcast creation
- fan-out to users

Frontend work:

- replace mock notification list
- connect admin broadcast interface

Test checklist:

- admin creates broadcast
- target users receive it
- dashboard notifications show real data

Done means:

- notification state comes from backend

---

### Phase 9: Certificates

Goal:

- certificates become real and tied to completion

Backend work:

- create certificate on completion
- certificate list endpoint
- generate endpoint if manual trigger still needed

Frontend work:

- replace mock certificates listing
- connect certificate page to backend

Test checklist:

- course reaches 100%
- certificate is created once
- certificate appears on certificates page

Done means:

- completion leads to real certificate record

---

### Phase 10: Final Integration and Cleanup

Goal:

- frontend no longer depends on mocks for core LMS behavior

What to remove or reduce:

- local mock persistence for auth
- local mock persistence for course ownership
- local mock persistence for payments
- local mock progress state

What to keep temporarily if needed:

- some fallback mock data during partial migration

Final tests:

- register -> login -> browse -> preview -> unlock -> learn -> complete -> certificate
- teacher creates course and publishes it
- admin manages categories and teachers

Done means:

- backend is the source of truth
- frontend is a real client

---

## 3. Exact Build Order We Should Follow

This is the recommended execution order from now:

1. Get backend runtime working
2. Run migrations
3. Seed initial categories and one admin
4. Connect frontend auth
5. Connect categories
6. Connect student course browsing
7. Connect teacher course creation/editing
8. Connect watchlist and my courses
9. Connect payment flow
10. Connect lesson progress
11. Connect dashboard payloads
12. Connect notifications
13. Connect certificates
14. Remove old mocks gradually

---

## 4. What We Test Before Moving to the Next Phase

For every phase, use this rule:

### Backend test

- endpoint returns correct shape
- endpoint saves correct data
- permissions work

### Frontend test

- page loads using backend data
- UI state matches backend response

### Integration test

- action on frontend changes real backend data
- refresh still shows correct state

Never move to the next phase if:

- the backend shape is still unstable
- the frontend still depends on the wrong data source
- refresh breaks the feature

---

## 5. What "Connect Frontend to Backend" Really Means

It means:

- stop reading that feature from mock files
- create API functions for that feature
- update hooks/providers to use API
- keep UI unchanged where possible

Examples:

### Auth connection

- replace local login/register simulation
- call `/api/auth/login/`
- call `/api/auth/register/`
- store backend tokens
- call `/api/auth/me/`

### Course connection

- replace local course list generation
- call `/api/courses/`
- call `/api/courses/<id>/`

### Payment connection

- replace `purchaseCourse()` mock unlock logic
- call `/api/payments/initialize/`
- call `/api/payments/verify/`
- refetch my courses and payments

---

## 6. Practical Working Method For Us

This is how we should work together from here:

### Step A

Pick one feature slice only.

Example:

- auth only

### Step B

Make backend for that slice stable.

### Step C

Connect frontend for that slice.

### Step D

Test that slice.

### Step E

Only then move to the next slice.

This is the safest path.

---

## 7. Immediate Next Step

The immediate next step should be:

### Next slice: Auth integration

Why:

- everything depends on real user identity
- role routing depends on auth
- watchlist, payments, progress, and teacher actions all depend on auth

Exact next work:

1. get backend runtime working
2. run migrations
3. create superuser
4. test auth endpoints manually
5. replace frontend auth mock with backend auth client
6. verify student/teacher/admin login flows

---

## 8. Final Rule

Do not try to "finish backend" first and "connect later."

For this project, the better rule is:

- build backend by feature
- connect frontend by feature
- test by feature

That gives us a clean roadmap and a working product at every stage.

---

## 9. What I Can Do Next

I can help in the exact working order.

Best next options:

1. start Phase 1 and prepare the frontend auth integration plan and code changes
2. review the backend auth code and tighten it further before integration
3. prepare the API client layer the frontend will use for all future backend calls
4. prepare the runtime checklist so you can actually boot Django and PostgreSQL first
