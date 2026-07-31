# Super Admin — capabilities, current state, improvements

> The Super Admin is the platform owner: full control over everything, including
> the admin team, money, settings, and certificates.
> For each area: **Should do** · **Has now** · **Could add**. Tick the items you
> want us to touch, then we build only those.

---

## 1. Dashboard (`/admin/dashboard`)
- **Should do:** at-a-glance health of the whole platform + quick jumps to act.
- **Has now:** real totals (users, teachers, students, courses, payments, revenue),
  system alerts (pending reviews, failed payments), top teachers, recent activity
  feed, registration/revenue/engagement charts.
- **Could add:** [ ] date-range filter · [ ] clickable stat cards (jump to that page)
  · [ ] "needs attention" tasklist · [ ] export snapshot.

## 2. Admin team (`/admin/admins`) — *Super Admin only*
- **Should do:** create/manage Admins & Moderators; protect the hierarchy.
- **Has now:** list admins, create (temp password, now emailed), change rank,
  deactivate. Safety rails: can't demote self, can't remove last Super Admin.
- **Could add:** [ ] last-login column · [ ] resend credentials · [ ] per-admin
  activity view · [ ] 2FA for admins · [ ] per-admin permission overrides.

## 3. Pending reviews (`/admin/reviews`)
- **Should do:** approve/decline teacher-submitted courses.
- **Has now:** queue of courses awaiting review; approve / decline (with the
  Moderator→Admin second-approval option from settings).
- **Could add:** [ ] decline reason sent to teacher · [ ] preview course before
  deciding · [ ] bulk approve.

## 4. Students (`/admin/students`)
- **Should do:** view/manage all learners.
- **Has now:** list students, search, suspend/activate, view plan/track,
  delete (Super Admin).
- **Could add:** [ ] per-student detail (enrollments, payments, progress) ·
  [ ] bulk actions · [ ] CSV export · [ ] grant free course access.

## 5. Create teacher (`/admin/teachers`)
- **Should do:** onboard a teacher with assigned category/track + temp password.
- **Has now:** create teacher form (category + tracks), temp password shown once
  and emailed, credential copy.
- **Could add:** [ ] resend invite · [ ] bulk import · [ ] set initial courses.

## 6. Manage teachers (`/admin/users`)
- **Should do:** edit/deactivate/reassign teachers and their courses.
- **Has now:** list teachers, edit tracks/status, deactivate (reassigns their
  courses to admin ownership), delete (Super Admin).
- **Could add:** [ ] per-teacher stats (courses, students, rating) · [ ] reassign
  a single course UI · [ ] search/filter.

## 7. Admin courses (`/admin/courses`)
- **Should do:** manage categories/tracks and the whole course catalog.
- **Has now:** create/edit categories + subcategories (tracks); view all courses;
  approve/decline/archive/restore/reassign/feature.
- **Could add:** [ ] reorder categories · [ ] mark "recommended" toggle ·
  [ ] filters (status/teacher/category) · [ ] bulk actions.

## 8. Admin-owned courses (`/admin/owned-courses`)
- **Should do:** create/manage MooreSkillUp-produced courses (no teacher).
- **Has now:** full course studio for admin-owned courses (sections, lessons,
  assignments, projects), publish directly.
- **Could add:** [ ] same Phase-2 studio polish as teachers (duplicate, versions).

## 9. Broadcasts (`/admin/broadcast-notifications`)
- **Should do:** message any audience, now or scheduled.
- **Has now:** send to students / teachers / admins / all; schedule for later;
  history; clear.
- **Could add:** [ ] message templates · [ ] rich text · [ ] read-rate stats ·
  [ ] recurring broadcasts · [ ] target a specific course's students.

## 10. Notifications (`/admin/notifications`)
- **Should do:** review broadcast history.
- **Has now:** broadcast history, delete, clear.
- **Could add:** [ ] **merge with Broadcasts** (they overlap — one page is cleaner).

## 11. Analytics (`/admin/analytics`)
- **Should do:** deep growth/performance insight + export.
- **Has now:** registrations, revenue, engagement views (platform-wide).
- **Could add:** [ ] date-range picker · [ ] CSV export · [ ] retention/cohort ·
  [ ] top courses/teachers · [ ] funnel (visit→enroll→complete).

## 12. Payments (`/admin/payments`)
- **Should do:** oversee revenue, refund within policy.
- **Has now:** transactions (course/student/status), totals, revenue CSV export,
  **refund** with required reason + policy guard (window + progress cap).
- **Could add:** [ ] filter by status/date · [ ] per-student payment history ·
  [ ] payout/teacher-earnings (future).

## 13. Certificates (`/admin/certificates`)
- **Should do:** own the certificate design + issuance + revocation.
- **Has now:** edit template (institution, signatory, accent, seal) with live
  preview; list all issued; revoke/restore.
- **Could add:** [ ] use your designer's certificate art · [ ] search by ID/student
  · [ ] re-issue · [ ] bulk export.

## 14. Support (`/admin/support`)
- **Should do:** handle tickets from students & teachers.
- **Has now:** all tickets, filter by status, reply (admin notes) + status change
  → notifies & emails the user; delete.
- **Could add:** [ ] assign to a specific admin · [ ] priority/category filters ·
  [ ] threaded replies · [ ] canned responses.

## 15. Activity logs (`/admin/activity-logs`)
- **Should do:** full audit trail of admin actions.
- **Has now:** every admin action (who/what/when, before→after), search, filters,
  CSV export, auto-cleanup by retention setting.
- **Could add:** [ ] filter by specific admin · [ ] login history.

## 16. Settings (`/admin/settings`)
- **Should do:** control platform-wide config.
- **Has now:** site name, maintenance mode, registration on/off, log retention,
  approval hierarchy, announcement permissions, student feature flags
  (reviews/certificates/recommendations/achievements/leaderboard/quiz),
  refund policy (window + progress cap).
- **Could add:** [ ] branding (logo/colors) · [ ] email/SMTP config UI ·
  [ ] payment keys UI · [ ] terms/privacy links.

---

## ✍️ Your picks
Tick the `[ ]` items you want, and add anything new here:
- [ ] _(your additions)_
