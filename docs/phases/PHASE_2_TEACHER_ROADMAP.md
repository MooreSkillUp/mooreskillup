# Phase 2 — Teacher Module ✅ COMPLETE (built 2026-06-14/15)

> Built milestone by milestone, each verified green (TypeScript clean, backend
> tests passing — 55 total). The locked spec below was delivered in full, minus
> cover-image uploads (removed by choice to save storage cost).
>
> **What shipped, by milestone:**
> - **T0** — Fixed the studio's backwards-typing bug.
> - **T1** — Course data model: level, discount price, SEO, tech-stack tags,
>   certificate flag; 5 lesson types incl. resource/assignment/project.
> - **T2** — Teacher Studio rebuilt (all of the above, validation gate).
> - **T3** — Student-accurate preview with desktop/tablet/mobile toggle.
> - **T4** — Per-teacher analytics (own courses only) + CSV export.
> - **T5** — Student management list (enrolled/active/completed) + CSV.
> - **T6** — Duplicate course, version history/restore, approval-hierarchy config.
> - **T7** — Announcement permission toggles + full certificate system
>   (template, auto-issue, `MSU-XXXX` IDs, public `/verify/<code>`, revoke).
>
> The original locked blueprint is preserved below for reference.

---

## Core principle (drives every decision below)

**All courses belong to MooreSkillUp — not to individual teachers.**
- Teachers are **content managers / facilitators**, not course owners.
- Branding stays 100% MooreSkillUp everywhere.
- Teacher profiles are **internal only** (no public bio, no personal branding).
- **Certificates are issued by MooreSkillUp** (Super Admin), never by teachers.

---

## What we are REMOVING (your decisions)

| Removed | Why | Replaced with |
|---|---|---|
| Internal task **file uploads** | Too heavy, no need | Submission via WhatsApp group / Google Form / external link |
| Internal **grading system** | Too time-consuming at scale | No grading — community handles it via WhatsApp |
| **Public teacher profiles / bios** | Courses are MSU-owned | Internal info only (name, email, phone, status) |
| **Teacher-owned certificates** | MSU owns certification | Super Admin issues all certificates |
| **Automatic teacher announcements** | Admin controls comms | Off by default; Super Admin can grant it as a setting |
| Direct **video file uploads** | Storage/bandwidth too costly | YouTube / Vimeo embeds only (paste URL) |

## What we are ADDING

✅ Cover image + thumbnail · ✅ Course level (Beginner/Intermediate/Advanced) ·
✅ Discount pricing · ✅ Resource lessons · ✅ Project lessons ·
✅ Assignment submission links (WhatsApp/Form/external) · ✅ Student-view preview
with device modes (desktop/tablet/mobile) · ✅ Real analytics + CSV export ·
✅ Content validation before submit · ✅ Duplicate course · ✅ Version history
& restore · ✅ SEO fields · ✅ Approval hierarchy (Moderator → optional Admin) ·
✅ Announcement-permission setting in Admin.

## What we are KEEPING (already works)

✅ Course builder · ✅ Sections (modules) → lessons · ✅ Section free/paid ·
✅ Draft system + autosave · ✅ Approval workflow · ✅ First-login password change ·
✅ Teacher created by admin with temp password.

---

## The Teacher Studio (the centerpiece — full rebuild)

### Header / course settings
- Cover image + thumbnail · Title · Subtitle · Category (inherited program + track)
- **Level:** Beginner / Intermediate / Advanced
- **Pricing:** Free, or Paid → Price + optional Discount price (NGN)
- **Visibility:** Draft / Private / Published (Published only after approval)
- **SEO:** Meta title + Meta description
- **Tech stack tags** ("Stacks" = the tools/technologies the course teaches,
  e.g. React, Python, Figma — shown as chips on the course card)

### Curriculum builder — Sections (modules) → 5 lesson types
1. **Video lesson** — paste YouTube/Vimeo URL → auto-embedded private player
2. **Text lesson** — rich text (the fixed editor)
3. **Resource lesson** — attach links: PDF, Documentation, GitHub repo,
   Google Drive, ZIP download, Website URL
4. **Assignment** — title + instructions + optional due date + **submission
   method** (WhatsApp group link / Google Form / external link) + a clear
   "how to submit" note. Renders a **Join Submission Group** button for students.
5. **Project** — title, description, requirements, deliverables, submission link
   (bigger than an assignment; completed off-platform)

- Sections remain markable **Free** or **Paid**
- Drag-and-drop reordering (keep)

### Video management
- Sources: Vimeo embed, YouTube embed, unlisted/private links
- Teacher pastes a URL → system builds the player automatically
- No raw URLs ever exposed to students (keep current behavior)

### Content validation (before "Submit for review")
Blocks submission until: title exists · thumbnail/cover exists · ≥1 section ·
≥1 lesson · paid courses have a price. Clear checklist shown in the studio.

### Publishing workflow buttons
Save Draft · Preview · Submit for Review · Publish (if authorized) · Archive ·
**Duplicate Course** · **Version History → Restore previous version**

### Approval hierarchy (configurable by Super Admin)
```
Teacher submits → Moderator approves → (optional) Admin approval → Published
```
- Moderator and Super Admin can both approve (Super Admin can always approve).
- Super Admin setting: "Require second approval from an Admin" ON/OFF.

---

## Teacher Dashboard (cards + quick actions)

**Cards:** Total Courses · Published · Drafts · Total Students · Completion
Rate · Average Rating · Pending Reviews · Course Views.
**Quick actions:** Create Course · Edit · Preview · Submit for Approval ·
Analytics · Export Reports.

## Course Preview (major upgrade)
- **Exactly the student view** (reuse the real student lesson/course UI)
- Device toggle: **Desktop / Tablet / Mobile**
- Free vs paid locking shown the way students will actually see it

## Teacher Analytics (+ CSV export everywhere useful)
- Course views · Enrollments · Completion rate · Active learners
- Most-watched / least-watched lessons · Drop-off points (lesson heatmap)
- Charts: Enrollment trend · Completion trend · Activity trend
- **Export CSV** for student progress, enrollments, and analytics

## Student Management (teacher view — kept simple)
- Overview: Total Enrolled · Active · Completed · Inactive
- List: Name · Enrollment date · Progress % (+ CSV export)
- No deep per-student tracking

## Teacher Profile (internal only)
- Name · Email · Phone · Status — not shown publicly anywhere

## Certification (MooreSkillUp-owned)
- **Teacher** only marks a course **"Ready for Certification."**
- **Super Admin** owns templates + issuance: certificate number, **verification
  code**, signature, seal. System auto-generates; students receive after
  completion. (Student-side delivery lands in Phase 3.)

## Announcements (permission-gated)
- Teachers have **no** announcement power by default.
- New **Admin → Settings** toggles: "Allow Teacher Announcements" ON/OFF and
  "Allow Moderator Announcements" ON/OFF. Off = only Admin announcements show.

---

## Build milestones (each ends green: tests pass, `tsc` clean, no dead buttons)

| # | Milestone | What you'll see |
|---|---|---|
| **T0** | Studio bug fixes | ✅ Backwards-typing fixed; LTR everywhere; layout polish |
| **T1** | Backend data foundation | New course fields, lesson types, Assignment/Project/Resource models, version history — migrations + tests |
| **T2** | Studio rebuild (frontend) | Cover image, level, discount, SEO, stacks, 5 lesson types, validation gate |
| **T3** | Preview system | Student-accurate preview with desktop/tablet/mobile toggle |
| **T4** | Analytics + CSV export | Real metrics, charts, downloadable reports |
| **T5** | Student management | Enrolled/active/completed lists + CSV |
| **T6** | Workflow | Duplicate course, version history/restore, approval-hierarchy config |
| **T7** | Settings + certification hooks | Announcement-permission toggles; "Ready for Certification" + Super Admin cert issuance |

> File storage note: cover images and resource files need durable storage
> (local disk wipes on redeploy). Plan: **Cloudflare R2** (free tier). Until it's
> wired, image/resource fields accept a URL so nothing is blocked; real uploads
> arrive with the storage setup inside T2.

---

## 3 calls I made for you (say if you disagree) + 1 question

1. **"Stacks" = tech-stack tags** (tools the course teaches, shown as chips).
   *If you meant something else, tell me.*
2. **Storage = Cloudflare R2** for cover images/resources (free tier; I'll guide
   the 5-minute setup when we reach T2).
3. **Approval default = Moderator approves; Admin second-approval is an optional
   Super Admin toggle** (Super Admin can always approve directly).

**Question:** course **pricing** — teachers keep setting their own price, or
should pricing be **locked until admin review** (admin confirms the price when
approving)? *(My recommendation: teacher sets it, admin can adjust during
review — flexible and still controlled.)*

✍️ **Add anything else you want here, then say "build T1" and I start.**
