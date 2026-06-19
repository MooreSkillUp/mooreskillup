# Phase 1 — Admin Foundation & Tiered Roles ✅

> What was agreed, what was built, how it works, and what is still open.
> Completed: 2026-06-12 · Status: **DONE** (32 backend tests passing, build green)

## The locked decisions

| Decision | Choice |
|---|---|
| Admin tiers | All three from day one: **Super Admin / Admin / Moderator** |
| Permissions | Fixed per-rank matrix (no per-person overrides in v1) |
| Tier names | Standard names (Super Admin / Admin / Moderator) |
| Bootstrap page | Auto-disables forever once a Super Admin exists |

## The three ranks (plain English)

- **Super Admin (you):** everything — manages the admin team, settings,
  payments/refunds, deletes, audit export.
- **Admin (staff):** daily operations — teachers, students, courses,
  broadcasts, support. Cannot manage admins, edit settings, delete people,
  or touch refunds.
- **Moderator (helper):** review courses (approve/decline/archive), handle
  support tickets (notes only, can't close), moderate reviews, view activity.
  Sees no money and no user management.

Safety rails: you cannot change your own rank or deactivate yourself, and the
system refuses to remove the **last active Super Admin**. Deactivating an
admin blocks them on their very next request.

## Key flows

**Becoming Super Admin (one time):** set `ADMIN_REGISTRATION_TOKEN` in
`backend/.env` → register at `/auth/admin-register` with that token → the
page permanently closes.

**Creating admins:** Sidebar → *Admin team* → enter name/email, pick rank →
temporary password shown **once** → they log in and change it.

**Lost password:** everyone (including Super Admin) uses the normal
forgot-password email flow. Server-owner emergency fallback:
`python manage.py changepassword your@email.com`.

## What was built

### Backend
| Piece | Where |
|---|---|
| Permission matrix + enforcement (single source of truth) | `backend/common/rbac.py` |
| Admin rank on the user account (`admin_role`) | `backend/apps/accounts/models.py` + migration 0005 |
| Granular permission checks on **every** admin endpoint (replaced the old flat "is admin" check) | all apps' views |
| Admin team API (list/create/change rank/deactivate) | `/api/admin/admins/` |
| Bootstrap lockdown (403 once a Super Admin exists) | `AdminRegisterView` |
| Audit trail with actor snapshot, before/after changes, IP, auto-retention | `backend/apps/platform/` |
| Platform settings (maintenance mode, registration toggle, log retention, site name) | `/api/admin/settings/` |
| Maintenance middleware (blocks non-admins with your message, admins keep working) | `apps/platform/middleware.py` |
| Scheduled broadcasts + "Admins" audience + delivery command | `apps/notifications/` (`send_due_broadcasts`) |
| Login/registration/reset rate limiting; refresh-token blacklist after rotation | `config/settings/base.py` |
| Public status endpoint (for maintenance banners) | `/api/platform/status/` |
| Test suite — the project's first | `apps/accounts/tests/`, `apps/platform/tests/` (32 tests) |

### Frontend
| Piece | Where |
|---|---|
| Logged-in user carries `adminRole` + server-granted `permissions` | `src/lib/auth.tsx` |
| `can()` checks now use the real backend permission list | `src/lib/use-admin.ts` |
| Sidebar shows/hides links by permission (moderators see a short menu) | `src/components/dashboard/Sidebar.tsx` |
| **Admin team** page (create admins, change ranks, deactivate, copy credentials) | `src/app/admin/admins/` |
| **Activity logs** page on the real audit API (search, filters, pagination, CSV export) | `src/app/admin/activity-logs/` |
| **Settings** page (all switches actually work) | `src/app/admin/settings/` |
| Broadcasts: "Admins" audience + schedule date-time picker | `src/app/admin/broadcast-notifications/` (folder typo fixed) |
| Builds now FAIL on type errors (was silently ignored before) | `next.config.mjs` |

## How to verify it works

1. Restart backend (migrations apply automatically via Docker/Procfile).
2. Bootstrap your Super Admin (see flow above).
3. Create a Moderator from *Admin team*; log in as them in a private window —
   the sidebar shrinks, and directly visiting `/admin/payments` is blocked by
   the server.
4. Approve a course / change a setting → see it appear in *Activity logs*.
5. Schedule a broadcast 5 minutes ahead → it shows "scheduled", then delivers.

---

## ⏳ Still to work on (owner's list — revisit after later phases)

> Items the owner wants to refine on the admin system. Add freely below;
> nothing here blocks Phases 2–6.

- [ ] _(add your items here)_

### Suggested candidates (from the build, optional)
- [ ] Email the temporary password to new admins/teachers automatically (today it's copy-paste)
- [ ] Two-factor authentication (2FA) for admin accounts
- [ ] Per-admin permission overrides on top of ranks (was deferred from v1)
- [ ] Admin dashboard variations per rank (moderator-focused work queue view)
- [ ] "Last login" and session history on the Admin team page
- [ ] Delete the now-dead mock libraries (`admin-audit.ts`, `support-tickets.ts`,
      `broadcast-notifications.ts`, `bulk-operations.ts`, `admin-settings.ts`)
      once nothing imports them
- [ ] Recurring broadcasts (e.g., weekly reminders)
