# Super Admin Updates — your full list, tracked

## ✅ Done — cross-cutting + critical bugs
- [x] **Session expired → clean redirect** to login with a clear notice (no more red
      "session expired" banners across dashboards). Applies platform-wide.
- [x] **Sidebar scrolls** on short screens (no longer squishes into the logout button).
- [x] **Header workspace label** is role-specific: *Super Admin / Admin / Moderator /
      Teacher / Student workspace*.
- [x] **Header profile** shows role + status (e.g. "Super Admin · Active").
- [x] **Sidebar label** shows the real tier (Super Admin / Admin / Moderator).
- [x] **Role avatars** — admins get fixed, unique avatars (👑 Super Admin, 🛡️ Admin,
      ⚖️ Moderator) not used anywhere else; teachers & students pick theirs in Settings.
- [x] **Watchlist (heart)** removed from header for admins/teachers (students only).
- [x] **Studio auto-reset bug FIXED** — autosave no longer wipes your edits; it keeps
      your current work and only syncs the real IDs. (Fixes teacher **and** admin studio.)
- [x] **Video preview is collapsible** in the studio (Show/Hide) so it doesn't choke space.
- [x] **Course deletion approval (NEW)** — teachers can no longer delete platform courses;
      they *request* deletion → admins approve (real delete + audit + notify) or abort.
      Verified with tests.

## ✅ Done — Super Admin items 1–10

### Dashboard (1)
- [x] Removed the broadcast block, teacher snapshot, and teacher-continuity widgets.
- [x] Trimmed the activity feed (recent 6, with a date-range filter: 7 / 30 / 90 / all).
- [x] True control panel: **clickable stat cards** (jump to each page), **"needs attention"**
      tasklist (reviews · deletion requests · open tickets · failed payments), shortcuts + mini-stats.

### Admin team (2)
- [x] **Delete an admin** with type-the-name-to-confirm; keeps their past work + audit (SET_NULL).
      Guards: can't delete self or the last super admin. *(tested)*
- [x] Tier badge **clearly visible** (amber Super Admin / blue Admin / slate Moderator).
- [x] **Last-login** column · **resend credentials** (emails a fresh temp password).
- [ ] _Deferred:_ per-admin activity link, simple 2FA, per-admin permission overrides.

### Pending reviews (3)
- [x] **Decline reason** modal → emailed to teacher + in-app notification.
- [x] Preview the course (student-style dropdown) before approve/decline.

### Students (4)
- [x] **Bulk actions** (select → suspend / reactivate) · **CSV export** · **grant free course access**
      (creates an `admin_grant` enrollment + notifies the student). *(tested)*

### Create teacher (5)
- [x] Removed the "first login flow" + "copy credentials" sections (credentials emailed now).
- [x] **Resend invite** (emails a fresh temp password, forces change on next login).

### Manage teachers (6)
- [x] **Type-the-name-to-confirm** on delete · **search + status filter**.
      (Create + manage now live on one page.)

### Admin courses (7)
- [x] **Community link per program** (WhatsApp/Discord) — students on that program see
      **"Join community"** on their dashboard + settings.
- [x] **Featured = top of browse** for all students (across every sort order).
- [x] **Reorder categories** (up/down) · **"recommended" toggle** · **filters** (status / owner / program / track).
- [ ] _Deferred:_ multi-select bulk actions on the course list (bulk shipped on Students instead).

### Admin-owned courses (8)
- [x] **Edit / preview / publish / unpublish / archive / restore** fully wired (shared studio).
- [x] Preview shows **dropdown sections** exactly like students see (lessons / projects / video),
      with device modes. Same studio fixes as teacher.

### Broadcasts & Notifications (9, 10) — kept SEPARATE
- [x] Broadcast: **Moderators** audience added · title/header field · **quick templates**
      (welcome / seasonal / maintenance / new-courses) · schedule (send now or later). *(tested)*
- [x] Notifications page: header renamed to "Notification history" (dropped "broadcast control"),
      count chip added; the header bell already carries the live unread badge.
- [ ] _Deferred:_ rich-text body + recurring schedule for broadcasts.

## ⏸️ Items 11–16 — awaiting your update
Analytics · Payments · Certificates · Support · Activity logs · Settings.

## ➡️ Next: role passes
After 11–16, we run the **"should do / has now / could add"** review per role —
**Admin → Moderator → Teacher → Student** — you tick what to touch, then we build.
