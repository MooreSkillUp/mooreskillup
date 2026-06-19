# Stabilization Guide — page by page to deploy-ready

> We work top to bottom. Each stage has a clear "done" bar. You test after each
> and give the thumbs-up (or list fixes) before we move on. Check items off as we go.

---

## STAGE 1 — Outside pages (no dashboard)

### 1A. Home / landing (`/`)
This app sits behind your main marketing site, so it does **not** need its own
marketing pages — just a clean landing + a working footer.
- [ ] Remove unneeded public pages: `/courses`, `/contact`, `/pricing`, `/faq`.
- [ ] Remove orphan duplicate routes: `/login`, `/register`, `/quiz-shop`, `/teacher/upload`.
- [ ] Footer: social icons clickable and pointing to **your real links** (you provide them).
- [ ] Landing is fast + responsive (mobile / tablet / desktop).
- **Done when:** landing looks right, footer links work, no dead marketing links.

### 1B. Auth pages
- [ ] `/auth/login`, `/auth/register` — clean, fast, responsive, good errors.
- [ ] `/auth/forgot-password`, `/auth/reset-password` — full flow works.
- [ ] `/auth/admin-register` (bootstrap), `/auth/teacher-register` — correct behavior.
- **Done when:** every auth screen works end-to-end and looks right on mobile.

### 1C. Certificate verification (public)
- [ ] New `/verify` page with an **input box** — type/paste a certificate ID,
      click Verify, see the result (valid → name/course/date, or invalid).
- [ ] Keep `/verify/[code]` for direct links from certificates/QR.
- **Done when:** an employer can verify a certificate by typing its ID.

---

## STAGE 2 — Dashboards (role by role)

For each role: every page loads, every button does what it says, responsive, no dead ends.

- [ ] **2A. Super Admin** — admins, settings, certificates, payments/refunds, audit, broadcasts, approvals.
- [ ] **2B. Admin** — teachers, students, courses, support, analytics (no admin-mgmt/settings-edit).
- [ ] **2C. Moderator** — review queue, support, reviews moderation, activity (limited menu).
- [ ] **2D. Teacher** — studio, courses, students, analytics, announcements, support, settings.
- [ ] **2E. Student** — dashboard, courses (browse/my/recommended), lesson player, certificates, payments, support, settings.

---

## STAGE 3 — Final polish
- [ ] Consistent loading / empty / error states everywhere.
- [ ] Mobile responsiveness sweep across all kept pages.
- [ ] Remove any remaining dead code.

---

## How we work it
1. I do a stage, report what changed + how to test.
2. You test and reply "good" or list fixes.
3. We don't move on until that stage is solid.

After all stages are green → **Phase 6 (deploy).**

### Your inputs needed
- **Social links** for the footer (LinkedIn, X, Instagram, Facebook, TikTok, YouTube, WhatsApp — give whichever you use).
