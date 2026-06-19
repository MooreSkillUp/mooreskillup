# How to Test — Admin & Teacher (current build)

A hands-on walkthrough of everything built in Phase 1 (Admin) and Phase 2
(Teacher), plus a map of how each screen is wired to the backend.

---

## 0. Start the app

Everything runs with one command (Docker runs Postgres + Redis + Django + Next.js,
and **auto-applies database migrations** on boot):

```bash
docker compose up --build
```

- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8000**
- One setting to check first: open `backend/.env` and set a value you'll remember:
  `ADMIN_REGISTRATION_TOKEN=my-secret-token`

> No Docker? Run Postgres yourself, then in `backend/`: `python manage.py migrate`
> then `python manage.py runserver`; in the project root: `npm install && npm run dev`.

**Tip on emails:** password-reset emails print to the terminal by default
(`docker compose logs -f api`), not a real inbox. That's expected locally.

---

## 1. Create the Super Admin (one time)

1. Go to **http://localhost:3000/auth/admin-register**
2. Fill in your details **+ the `ADMIN_REGISTRATION_TOKEN`** you set.
3. You're now **Super Admin** → lands on `/admin/dashboard`.
4. ✅ **Verify the lockdown:** open `/auth/admin-register` again — it should now
   refuse ("Admin registration is closed"). The page self-disables forever once a
   Super Admin exists.

---

## 2. Admin tests

### 2a. Admin team & tiers (Super Admin only)
- Sidebar → **Admin team** (`/admin/admins`).
- Create an **Admin** and a **Moderator** — each gives a **temporary password shown once** (copy it).
- ✅ Open a **private/incognito window**, log in as the **Moderator**:
  - Sidebar is short (Dashboard, Pending reviews, Admin courses, Support, Reviews, Activity logs).
  - Type `/admin/payments` in the URL bar → **blocked** (server-enforced, not just hidden).
- Back as Super Admin: change the Moderator's rank, or **Deactivate** them.
- ✅ Safety rails: you can't change your own rank, and the system won't remove the last Super Admin.

### 2b. Categories + a teacher (needed before teacher tests)
- Sidebar → **Admin courses** (`/admin/courses`) → create a **Category** and a **Subcategory** (track).
- Sidebar → **Create teacher** (`/admin/teachers`) → fill name/email, pick the category + track →
  **copy the temporary password**.

### 2c. Settings (Super Admin)
- Sidebar → **Settings** (`/admin/settings`):
  - Toggle **Maintenance mode** on → in another browser a non-admin is blocked (503); admins still work. Turn it back off.
  - Toggle **Student registration open** off → public `/auth/register` is refused.
  - **Require admin second approval**, **Allow teacher announcements**, **Allow moderator announcements** — used below.
  - Change **"keep logs for X days"** — controls automatic activity-log cleanup.

### 2d. Activity logs (audit trail)
- Sidebar → **Activity logs** (`/admin/activity-logs`).
- Every admin action you took above appears here (who, what, when, before→after).
- Filter by type, search, and (Super Admin) **Export CSV**.

### 2e. Broadcasts
- Sidebar → **Broadcasts** (`/admin/broadcast-notifications`).
- Send to **Students / Teachers / Admins / All**. Or set a future date+time to **schedule** it.
- ✅ Recipients see it in their notification bell. Scheduled ones send when due.

### 2f. Course approval workflow
- After a teacher submits a course (step 3f), go to **Pending reviews** (`/admin/reviews`).
- Approve or decline. With **"require admin second approval"** ON, a *moderator's* approval
  marks the course **"approved"** (waiting) and an Admin/Super Admin publishes it.

### 2g. Certificates (Super Admin)
- Sidebar → **Certificates** (`/admin/certificates`).
- Edit the template (institution, signatory, accent colour, signature, seal) → **live preview** updates.
- The **issued list** fills automatically as students complete certificate-enabled courses (Phase 3).
- **Revoke/restore** any certificate (revoked ones fail public verification).
- ✅ Try the public page directly: `/verify/MSU-ANYTHING` → shows "Not verified" (no real code yet).

---

## 3. Teacher tests

Log in (incognito) as the **teacher** you created in 2b, using the temp password.

### 3a. First-login password change
- ✅ You're prompted to set a new password on first login.

### 3b. The Studio — create a course
- Sidebar → **Create course**. Fill: title, subtitle, **level**, **pricing** (Free or Paid + optional discount),
  **tech stack** chips, **tags**, overview, scheme of work, **SEO** fields, and the **"Ready for Certification"** toggle.
- ✅ **Type in the overview editor** — text now reads left-to-right correctly (the backwards-typing bug is fixed).

### 3c. The 5 lesson types
In a section, **Add Lesson** and try each Content Type:
- **Video** — paste a YouTube/Vimeo link → an embedded player preview appears.
- **Text** — rich text.
- **Resource** — **Add resource** rows (PDF / GitHub / Drive / ZIP / Docs / Website) with title + URL.
- **Add Assignment** — pick submission method (**WhatsApp group / Google Form / external link**),
  paste the link, write "how to submit", optional due date. *(No uploads, no grading — by design.)*
- **Add Project** — description, requirements, deliverables, submission link.

### 3d. Validation gate
- The right-hand **Validation** panel lists what's missing (e.g. "Resource lesson needs a link",
  "Assignment needs a submission link"). Publishing is blocked until it's clean.

### 3e. Preview (student view)
- Click **Preview** → opens the **student-accurate** view with a **Desktop / Tablet / Mobile** toggle.
- ✅ Videos play, resources show as clickable chips, assignments show "Join submission group",
  paid sections show as locked.

### 3f. Submit for review
- **Publish** → submits for admin review (status becomes "review"). A **version snapshot** is saved.
- Now go approve it as admin (step 2f), then it's live.

### 3g. Duplicate & version history
- **My courses** (`/teacher/courses`) → **Duplicate** any course → a draft copy "… (Copy)" appears.
- In the editor sidebar → **Version history** → **Restore** a previous snapshot (current work is snapshotted first).

### 3h. Analytics & students (scoped to this teacher only)
- Sidebar → **Analytics** (`/teacher/analytics`) — totals, enrollment trend chart, per-course table, **Export CSV**.
- Sidebar → **Students** (`/teacher/students`) — enrolled list with progress, status, **Export CSV**.
- ✅ A second teacher only ever sees *their own* courses/students — never platform-wide.

### 3i. Announcements
- Sidebar → **Announcements** (`/teacher/announcements`).
- If the admin turned **"Allow teacher announcements"** OFF → page explains it's disabled.
- If ON → send a message to all your students (or one course) → they get it in their bell.

---

## 4. How it's wired (frontend → backend)

| Screen | Frontend module | Backend endpoint(s) |
|---|---|---|
| Login / register / reset | `src/lib/auth.tsx` | `/api/auth/login`, `/register`, `/admin-register`, `/me`, `/refresh` |
| Admin team | `src/lib/admin-team.ts` | `/api/admin/admins/` |
| Activity logs / Settings | `src/lib/platform-admin.ts` | `/api/admin/audit-logs/`, `/api/admin/settings/` |
| Broadcasts / Support / Dashboard | `src/lib/admin-platform.ts` | `/api/admin/broadcasts/`, `/api/admin/support-tickets/`, `/api/dashboard/admin/` |
| Certificates (admin) | `src/lib/certificates-admin.ts` | `/api/admin/certificates/`, `/template/`, `/<id>/revoke/` |
| Public verification | `src/lib/certificates-admin.ts` | `/api/certificates/verify/<code>/` (no auth) |
| Teacher studio / courses | `src/lib/teacher-platform.ts` | `/api/teacher/courses/`, `/sections/`, `/lessons/`, `/tasks/`, `/projects/`, `/duplicate/`, `/versions/` |
| Teacher analytics / students | `src/lib/teacher-analytics.ts` | `/api/teacher/analytics/`, `/api/teacher/students/` (+ `/export/`) |
| Teacher announcements | `src/lib/teacher-platform.ts` | `/api/teacher/announcements/` |

**The chain for every screen:** a React page calls a hook in `src/lib/*` →
the hook calls `authenticatedRequest` (attaches the JWT, auto-refreshes on 401) →
hits a Django REST endpoint → a DRF permission class checks the user's role/tier →
the view reads/writes Postgres and returns JSON. Security is enforced on the
**server**, so hiding a button in the UI is never the only protection.

---

## 5. Quick automated check (optional)
From `backend/` (with the venv): `python -m pytest apps -q` → **55 tests** cover
the roles, permissions, audit, settings, analytics scoping, workflow, and
certificates. From the project root: `npx tsc --noEmit` → type-clean.
