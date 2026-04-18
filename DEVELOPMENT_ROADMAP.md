# MooreSkillUp — Complete Development & Deployment Roadmap

This is the **master guide** for building, extending, and deploying MooreSkillUp. Start here.

---

## 📖 Table of Contents

1. [Quick Start](#quick-start) — Get running in 5 minutes
2. [Project Organization](#project-organization) — Understand the structure
3. [Feature Guide](#feature-guide) — How each feature works
4. [Development Workflow](#development-workflow) — Standard development process
5. [Backend Integration](#backend-integration) — Connect Django API
6. [Deployment Checklist](#deployment-checklist) — Go live safely
7. [Troubleshooting](#troubleshooting) — Common issues & fixes

---

## ⚡ Quick Start

### For Local Development

```bash
# 1. Clone & install
git clone <repo>
cd mooreskillup-dashboard
bun install

# 2. Create .env.local
cp .env.example .env.local
# Edit .env.local with your Formspree ID & WhatsApp number

# 3. Start dev server
bun run dev

# 4. Open in browser
# http://localhost:5173
```

### For First-Time User Testing

```bash
# On landing page:
# 1. Click "Get Started"
# 2. Register with test account
# 3. Explore dashboard, courses, lessons
# 4. Try quiz and certificate
# 5. Check leaderboard & achievements
```

---

## 🗂️ Project Organization

### Frontend Structure
```
src/
├── routes/                      # Pages (TanStack Router file-based)
│   ├── index.tsx               # Landing page + pricing
│   ├── dashboard.tsx           # Main dashboard
│   ├── courses.tsx             # Course listing
│   ├── course.$id.tsx          # Course detail
│   ├── lesson.$id.tsx          # Individual lesson
│   ├── quiz.$id.tsx            # Quiz page
│   ├── certificates.tsx        # User certificates
│   ├── leaderboard.tsx         # Rankings
│   ├── achievements.tsx        # Badges
│   ├── contact.tsx             # Contact form (NEW)
│   ├── login.tsx               # Login page
│   ├── register.tsx            # Registration
│   ├── settings.tsx            # User settings
│   └── __root.tsx              # Root layout
│
├── components/
│   ├── dashboard/              # Layout & feature components
│   │   ├── AppShell.tsx        # Main wrapper
│   │   ├── Sidebar.tsx         # Navigation (with Contact link)
│   │   ├── TopNavbar.tsx       # Header
│   │   ├── CourseCard.tsx      # Course preview
│   │   ├── LessonCard.tsx      # Lesson preview
│   │   └── ...
│   ├── ui/                     # shadcn/ui components
│   │   └── *.tsx              # Pre-built Radix UI components
│   └── ui-kit/                # Custom components
│       ├── Button.tsx
│       ├── Input.tsx
│       └── ProgressBar.tsx
│
├── hooks/                       # React hooks
│   └── use-mobile.tsx          # Mobile detection
│
├── lib/                         # Core utilities & data
│   ├── auth.tsx                # Authentication (mock)
│   ├── mock-data.ts            # Sample data (replace with API)
│   ├── quiz-data.ts            # Sample quizzes
│   ├── theme.tsx               # Dark mode provider
│   ├── gamification.ts         # Badge/streak logic
│   ├── certificate.ts          # PDF generation
│   └── utils.ts                # Helpers
│
├── router.tsx                   # Router config
├── styles.css                   # Tailwind + global styles
└── components.json             # shadcn config
```

### Key Files to Modify

| When You Want To... | Edit This File |
|---|---|
| Add a new page | Create in `src/routes/` |
| Add header/nav items | `src/components/dashboard/TopNavbar.tsx` |
| Add sidebar links | `src/components/dashboard/Sidebar.tsx` |
| Change colors/theme | `src/styles.css` or `tailwind.config.js` |
| Add course data | `src/lib/mock-data.ts` → replace with API calls |
| Modify contact form | `src/routes/contact.tsx` |
| Landing page | `src/routes/index.tsx` |

---

## 🎯 Feature Guide

### 1. Authentication
- **Files**: `src/lib/auth.tsx`, `src/routes/login.tsx`, `src/routes/register.tsx`
- **Current**: Mock with localStorage
- **To Production**: Replace with JWT tokens from Django API
- **See Also**: [Django Integration Guide](DJANGO_INTEGRATION.md)

### 2. Courses & Lessons
- **Files**: `src/routes/courses.tsx`, `src/routes/course.$id.tsx`, `src/routes/lesson.$id.tsx`
- **Data**: `src/lib/mock-data.ts` (mockCourses, mockLessons)
- **Features**:
  - Browse courses
  - View modules
  - Mark lessons complete
  - Track progress
- **To Connect Backend**: Update `src/lib/auth.tsx` to fetch courses from API

### 3. Quiz System
- **Files**: `src/routes/quiz.$id.tsx`
- **Data**: `src/lib/quiz-data.ts`
- **Features**:
  - Multiple-choice questions
  - Instant feedback
  - Passing score logic
  - Points reward
- **API Integration**: POST to `/api/quizzes/{id}/submit/` with answers

### 4. Certificates
- **Files**: `src/routes/certificates.tsx`
- **Library**: jsPDF for PDF generation
- **Backend**: Call `/api/user/certificates/` to list
- **Download**: User can download PDF directly

### 5. Leaderboard
- **Files**: `src/routes/leaderboard.tsx`
- **Features**: Podium (top 3) + full standings
- **Backend**: GET `/api/leaderboard/` for rankings
- **Real-time**: Update every 1 hour or on quiz completion

### 6. Achievements & Badges
- **Files**: `src/routes/achievements.tsx`, `src/lib/gamification.ts`
- **Features**: 8 collectable badges with unlock criteria
- **Backend**: GET `/api/user/achievements/` to check earned badges

### 7. Streak Tracking
- **Files**: `src/components/dashboard/StreakWidget.tsx`
- **Features**: 7-day display, longest streak, daily activity
- **Backend**: GET `/api/user/streak/` for streak data
- **Card Location**: Dashboard sidebar widget

### 8. Contact Form (NEW)
- **Files**: `src/routes/contact.tsx`
- **Integration**: Formspree (free email service)
- **Setup**: See [Formspree Setup Guide](FORMSPREE_SETUP.md)
- **WhatsApp**: Direct link to WhatsApp (green button)
- **Backend**: Optional — can attach Django contact model

### 9. Pricing Section (NEW)
- **Location**: Landing page (`src/routes/index.tsx`)
- **Plans**: Free (3 courses) + Pro ($29/month)
- **Features**: Comparison table, benefits list
- **Backend**: Optional — integrate payment processor (Stripe, etc.)

---

## 🔄 Development Workflow

### Standard Development Process

```
1. Create Feature Branch
   git checkout -b feature/my-feature

2. Make Changes
   - Edit component files
   - Test locally (bun run dev)
   - Use Framer Motion for animations
   - Follow Tailwind conventions

3. Test
   - Manual testing in browser
   - Check mobile responsive (use Dev Tools)
   - Dark mode toggle
   - Error states

4. Commit & Push
   git add .
   git commit -m "feat: description"
   git push origin feature/my-feature

5. Create Pull Request
   - Describe changes
   - Link relevant issues
   - Request review

6. Merge to Main
   - After review
   - Delete branch
```

### Code Style

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router (file-based)
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui + custom components
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Linting**: ESLint (auto-run on commit)

### Adding a New Page

```bash
# 1. Create route file
touch src/routes/my-page.tsx

# 2. Add component
# src/routes/my-page.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page")({
  component: MyPage,
});

function MyPage() {
  return <div>Content here</div>;
}

# 3. Auto-generated route tree
# TanStack Router auto-generates src/routeTree.gen.ts
# No manual steps needed!

# 4. Add to sidebar (if needed)
# Edit src/components/dashboard/Sidebar.tsx
```

---

## 🔌 Backend Integration

### Step 1: Understand Current Mock Setup

All data comes from `src/lib/mock-data.ts`:

```typescript
// Current: Mock data in memory
const mockCourses = [{ id: 1, title: "JS Fundamentals", ... }];

// Future: API calls
const courses = await fetch('/api/courses/').then(r => r.json());
```

### Step 2: Create API Client Layer

Create `src/lib/api.ts`:

```typescript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  async login(email: string, password: string) {
    return fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());
  },

  async getCourses() {
    return fetch(`${BASE_URL}/courses/`).then(r => r.json());
  },

  // ... more endpoints
};
```

### Step 3: Replace Mock Auth

Update `src/lib/auth.tsx`:

```typescript
// BEFORE
const user = MOCK_USERS.find(u => u.email === email);

// AFTER
const result = await api.login(email, password);
localStorage.setItem('token', result.access);
setCurrentUser(result.user);
```

### Step 4: Use TanStack Query for Data

```typescript
import { useQuery } from '@tanstack/react-query';

function Courses() {
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  return <div>{...}</div>;
}
```

### Step 5: Set Up Django Backend

See [Django Integration Guide](DJANGO_INTEGRATION.md) for step-by-step backend setup.

---

## ☑️ Deployment Checklist

### Pre-Deployment

- [ ] All features tested locally
- [ ] No console errors or warnings
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Dark mode toggle works
- [ ] All links working
- [ ] Contact form tested with Formspree
- [ ] Environment variables configured
- [ ] No sensitive data in code (API keys, passwords)

### Build & Optimize

```bash
# Test production build locally
bun run build      # Creates optimized dist/
bun run preview    # Test production build

# Check bundle size
# Look for large dependencies that can be removed
```

### Environment Setup

Create `.env.production`:

```env
VITE_API_URL=https://api.mooreskillup.com
VITE_FORMSPREE_FORM_ID=f/your_form_id
VITE_WHATSAPP_NUMBER=1234567890
```

### Deploy to Cloudflare Pages (Recommended)

```bash
# Install Wrangler
npm install -g wrangler

# Build
bun run build

# Deploy
wrangler pages deploy dist/

# Custom domain (optional)
# https://developers.cloudflare.com/pages/configuration/custom-domains/
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Post-Deployment

- [ ] Visit live URL and test all features
- [ ] Check contact form receives emails
- [ ] WhatsApp button links correctly
- [ ] Analytics tracking works
- [ ] SSL certificate active (HTTPS)
- [ ] Redirects functioning (www → non-www, etc.)
- [ ] Monitoring/error tracking enabled (Sentry)

---

## 🐛 Troubleshooting

### Common Issues

#### Port 5173 Already in Use
```bash
# Kill the process
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

#### Dependencies Won't Install
```bash
# Clear cache
rm -rf node_modules bun.lockb
bun install
```

#### Routes Not Showing Up
```bash
# TanStack Router auto-generates routes
# Restart dev server if routes don't appear
bun run dev
```

#### Form Not Submitting
- Check Formspree Form ID in `.env.local`
- Verify form not in Sandbox mode
- Check browser console for errors

#### Dark Mode Not Working
- Ensure `ThemeProvider` wraps app in `__root.tsx`
- Check localStorage for `theme-mode` value
- Manually toggle to test

#### Build Fails
```bash
# Clear Vite cache
rm -rf .vite

# Rebuild
bun run build
```

---

## 📚 Documentation Map

| Document | Purpose |
|---|---|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Local setup & project overview |
| [DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md) | Build Django backend |
| [API_SCHEMA.md](API_SCHEMA.md) | API endpoint reference |
| [FORMSPREE_SETUP.md](FORMSPREE_SETUP.md) | Contact form setup |
| **This File** | Complete roadmap (you are here) |

---

## 🚀 Next Steps

### For Development
1. ✅ Clone repo
2. ✅ Follow SETUP_GUIDE.md
3. ✅ Explore the codebase
4. Create feature branch
5. Make changes & test
6. Submit pull request

### For Backend Integration
1. ✅ Read DJANGO_INTEGRATION.md
2. ✅ Set up local Django environment
3. Create models, serializers, views
4. Test API endpoints
5. Connect frontend to API (see Backend Integration section above)
6. Deploy Django to production

### For Going Live
1. ✅ Test entire app locally
2. Build production bundle
3. Deploy frontend (Vercel/Cloudflare)
4. Deploy backend (Heroku/Railway)
5. Configure custom domain
6. Enable monitoring
7. Announce publicly

---

## 💡 Tips & Best Practices

✅ **Do:**
- Break large components into smaller reusable ones
- Use TypeScript for type safety
- Keep components focused (single responsibility)
- Add animations with Framer Motion
- Test on actual mobile devices
- Document API integration points
- Use environment variables for config

❌ **Don't:**
- Hardcode API URLs (use .env)
- Mix concerns (keep data, UI, logic separate)
- Skip mobile testing
- Deploy without testing contact form
- Commit `.env.local` to git
- Ignore error states

---

## 📞 Support & Resources

- **Questions?** Check relevant documentation file
- **Issues?** Check Troubleshooting section
- **Want to contribute?** Follow Development Workflow
- **Found a bug?** Create GitHub issue with details

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 2026 | Initial release with all features |
| 1.1 | April 2026 | Added Contact page & Pricing section |
| 1.2 | April 2026 | Complete documentation suite |

---

**Last Updated**: April 2026  
**Maintained By**: MooreSkillUp Team  
**License**: [Your License Here]
