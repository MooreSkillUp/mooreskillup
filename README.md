# 🎓 MooreSkillUp — Modern Learning Platform

> A beautifully designed online learning platform with courses, lessons, quizzes, certificates, leaderboards, badges, streaks, contact forms, and pricing. **Frontend-complete and ready to integrate with Django backend.**

![Stack](https://img.shields.io/badge/React-19-61dafb)
![Stack](https://img.shields.io/badge/TypeScript-5-3178c6)
![Stack](https://img.shields.io/badge/TanStack%20Router-v1-ff4154)
![Stack](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Stack](https://img.shields.io/badge/Framer%20Motion-12-ff0080)

---

## ⚡ Quick Start

```bash
# Install & run dev server
bun install && bun run dev
# → http://localhost:5173
```

**New?** Start with [SETUP_GUIDE.md](SETUP_GUIDE.md) (15 min read)  
**Want the full picture?** Read [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) (30 min)  
**Building Django backend?** See [DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md) (4-6 hours)

---

## 🎯 Core Features

| Feature | Status | Details |
|---------|--------|---------|
| 🔐 **Authentication** | ✅ | Login/register with localStorage (easily swap for JWT) |
| 📚 **Courses & Lessons** | ✅ | Structured modules with video embeds & progress tracking |
| 🎥 **Video Lessons** | ✅ | YouTube integration, notes, mark complete |
| ✅ **Quiz System** | ✅ | Multiple-choice with instant feedback & scoring |
| 🏆 **Certificates** | ✅ | Auto-generated PDF downloads |
| 🥇 **Leaderboard** | ✅ | Ranked standings with your position |
| 🎖️ **Achievements** | ✅ | 8 collectible badges with earn criteria |
| 🔥 **Streak Tracking** | ✅ | 7-day visualization + longest streak |
| 📧 **Contact Form** | ✅ **NEW** | Formspree integration (free email service) |
| 📱 **Pricing Plans** | ✅ **NEW** | Free + Pro tiers with comparison table |
| 💬 **WhatsApp Support** | ✅ **NEW** | Quick contact button |
| 🌗 **Dark Mode** | ✅ | Toggle saved in localStorage |
| 📱 **Responsive** | ✅ | Mobile, tablet, desktop optimized |
| ✨ **Animations** | ✅ | Smooth page transitions & UI animations |

---

## 📚 Documentation

**Start here:**
- [`SETUP_GUIDE.md`](SETUP_GUIDE.md) — Local setup + project overview (START HERE!)
- [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) — Complete documentation map

**For specific tasks:**
- [`DJANGO_INTEGRATION.md`](DJANGO_INTEGRATION.md) — Step-by-step backend setup (4-6 hours)
- [`API_SCHEMA.md`](API_SCHEMA.md) — Complete API endpoint reference
- [`FORMSPREE_SETUP.md`](FORMSPREE_SETUP.md) — Contact form configuration (5 min)
- [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) — Full development guide + deployment

---

## 🛠️ Tech Stack

```
Frontend          Backend (To Build)    Services
─────────────     ──────────────────    ────────
React 19          Django 4.2            Formspree (email)
TypeScript        Django REST API       WhatsApp (messaging)
TanStack Start    PostgreSQL            Cloudflare (hosting)
Tailwind CSS      SimpleJWT (auth)      Stripe (payments)
Framer Motion     jsPDF (certs)
```

---

## 🚀 Getting Started (5 minutes)

### 1. Install Dependencies
```bash
bun install    # or: npm install
```

### 2. Create Environment File
```bash
cp .env.example .env.local
# Edit .env.local:
# - Add VITE_FORMSPREE_FORM_ID (from formspree.io)
# - Add VITE_WHATSAPP_NUMBER (your WhatsApp number)
```

### 3. Start Development Server
```bash
bun run dev
# → http://localhost:5173
```

### 4. Explore
- **Landing Page**: `/`
- **Register**: Click "Get Started"
- **Dashboard**: View courses & progress
- **Contact**: Visit `/contact` to see the form

---

## 📁 Project Structure

```
src/
├── routes/                      # Pages (TanStack Router)
│   ├── index.tsx               # Landing page + pricing
│   ├── dashboard.tsx           # Main dashboard
│   ├── courses.tsx             # Course listing
│   ├── lesson.$id.tsx          # Video lesson
│   ├── quiz.$id.tsx            # Quiz page
│   ├── contact.tsx             # Contact form (NEW)
│   ├── certificates.tsx        # PDF certificates
│   ├── leaderboard.tsx         # Rankings
│   ├── achievements.tsx        # Badges
│   ├── login.tsx               # Sign in
│   ├── register.tsx            # Sign up
│   └── ...
│
├── components/
│   ├── dashboard/              # Layout components
│   │   ├── AppShell.tsx        # Main wrapper
│   │   ├── Sidebar.tsx         # Navigation (with Contact link)
│   │   ├── TopNavbar.tsx       # Header
│   │   └── ...
│   ├── ui/                     # shadcn/ui components
│   └── ui-kit/                 # Custom components
│
├── lib/
│   ├── auth.tsx                # Authentication (mock)
│   ├── mock-data.ts            # Sample courses/lessons
│   ├── quiz-data.ts            # Sample quizzes
│   ├── gamification.ts         # Badges & leaderboard
│   ├── certificate.ts          # PDF generation
│   └── api.ts                  # API client (add when ready)
│
└── styles.css                  # Tailwind + design tokens


---

## 🤝 Contributing

1. Fork & clone
2. `npm install`
3. Create a feature branch: `git checkout -b feat/your-feature`
---

## 🔌 Backend Integration (Django)

### Current State
✅ **All data is mock** — frontend runs standalone with no backend.

### When You're Ready to Connect a Backend
1. **Read**: [`DJANGO_INTEGRATION.md`](DJANGO_INTEGRATION.md) — Complete step-by-step guide (4-6 hours)
2. **Reference**: [`API_SCHEMA.md`](API_SCHEMA.md) — All endpoint specifications
3. **Integrate**: Replace `src/lib/mock-data.ts` fetch calls with real API calls
4. **Test**: Use TanStack Query for caching & state management

---

## 🌐 New Features (v1.1)

### 📧 Contact Form
- **Location**: `/contact`
- **Integration**: Formspree (free, no backend needed)
- **Features**: Email, phone, subject selection, WhatsApp quick-link
- **Setup**: See [`FORMSPREE_SETUP.md`](FORMSPREE_SETUP.md) (5 minutes)

### 💰 Pricing Section
- **Location**: Landing page (`/`)
- **Plans**: Free ($0) + Professional ($29/month)
- **Features**: Comparison table, feature lists, trial offer
- **Customizable**: Edit pricing in `src/routes/index.tsx`

### 💬 WhatsApp Button
- **Locations**: Contact page + header
- **Setup**: Add `VITE_WHATSAPP_NUMBER` to `.env.local`
- **Direct linking**: Opens WhatsApp with pre-filled message

---

## 📋 Commands

```bash
# Development
bun run dev          # Start dev server (localhost:5173)
bun run build        # Production build
bun run build:dev    # Dev mode build
bun run preview      # Preview production build

# Code Quality
bun run lint         # ESLint check
bun run format       # Prettier format

# Deployment
# → See DEVELOPMENT_ROADMAP.md for deployment options
```

---

## 🎓 Learning Paths

### New Developer (No Backend)
1. Read [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
2. Explore `/` (landing page)
3. Register & explore dashboard
4. Check out courses, quizzes, certificates
5. Read [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) to understand code

### Full-Stack Developer (Want Backend)
1. Read [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
2. Read [`DJANGO_INTEGRATION.md`](DJANGO_INTEGRATION.md) (4-6 hours)
3. Build Django backend with provided schema
4. Connect frontend to API using [`API_SCHEMA.md`](API_SCHEMA.md)
5. Deploy both frontend & backend

### Product Manager / Designer
1. Sign up at `/register`
2. Explore all features (dashboard, courses, quizzes, leaderboard, certificates)
3. Check `/contact` and pricing on landing page
4. Review [`SETUP_GUIDE.md`](SETUP_GUIDE.md) #Features Overview

---

## 🚀 Deployment

### Frontend (Easy - 5 minutes)

**Cloudflare Pages** (recommended):
```bash
npm i -g wrangler
bun run build
wrangler pages deploy dist/
```

**Vercel**:
```bash
vercel --prod
```

**Netlify**:
```bash
netlify deploy --prod --dir=dist
```

See [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) #Deployment for full checklist.

### Backend (When Ready)
See [`DJANGO_INTEGRATION.md`](DJANGO_INTEGRATION.md) #Deployment section.

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following code style
3. Test locally
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Open a pull request

---

## ❓ FAQ

**Q: Do I need a backend to run this?**  
A: No! The frontend is fully functional with mock data. Add a Django backend when you're ready for persistence.

**Q: How do I set up the contact form?**  
A: See [`FORMSPREE_SETUP.md`](FORMSPREE_SETUP.md) — takes 5 minutes and uses a free service.

**Q: Can I customize the pricing?**  
A: Yes! Edit `src/routes/index.tsx` to change prices, features, and plan names.

**Q: What about payments?**  
A: Contact pricing section is UI-only. Integrate Stripe, Paddle, or Lemonsqueezy when ready.

**Q: How do I authenticate users with a real Django backend?**  
A: See [`DJANGO_INTEGRATION.md`](DJANGO_INTEGRATION.md) #Authentication System section.

---

## 📞 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** — Project overview & quick start ⭐
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** — Master guide for developers ⭐
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** — Map of all docs
- **[DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md)** — Backend setup (4-6 hours)
- **[API_SCHEMA.md](API_SCHEMA.md)** — Complete API reference
- **[FORMSPREE_SETUP.md](FORMSPREE_SETUP.md)** — Contact form setup (5 min)

---

**Latest Update**: April 2026  
**Maintained By**: MooreSkillUp Team
