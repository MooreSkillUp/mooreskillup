# MooreSkillUp — Complete Setup & Development Guide

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Project Structure](#project-structure)
5. [Features Overview](#features-overview)
6. [API Integration](#api-integration)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🎓 Project Overview

**MooreSkillUp** is a full-featured, modern learning management system (LMS) frontend built with React 19, TypeScript, and TanStack Router. It's designed to feel like a real product with:

- **User Authentication** (Login/Register)
- **Course Management** (Structured modules and lessons)
- **Quiz System** (Multiple-choice with scoring)
- **Certificate Generation** (Downloadable PDF certificates)
- **Leaderboard & Rankings** (Competitive gamification)
- **Achievement Badges** (8 collectible badges)
- **Streak Tracking** (7-day motivation tracking)
- **Dark Mode Support** (Manual toggle, persisted)
- **Fully Responsive Design** (Mobile-first approach)

### Key Architecture
- **Frontend Framework**: React 19 + TanStack Start (Vite)
- **Language**: TypeScript (strict mode)
- **Routing**: File-based routing with TanStack Router
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Mock data (ready for backend integration)
- **Backend**: Django REST API (to be implemented)

---

## ✅ Prerequisites

Before you start, ensure you have:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime (or Bun 1.0+) |
| **Bun** | 1.0+ | Package manager (recommended) or npm/yarn |
| **Git** | Any | Version control |
| **Python** | 3.9+ | For Django backend (future step) |
| **PostgreSQL** | 12+ | For Django database (future step) |

### Install Bun (Recommended)

```bash
curl -fsSL https://bun.sh/install | bash
```

Or use npm/yarn if preferred.

---

## 🚀 Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd mooreskillup-dashboard
```

### Step 2: Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### Step 3: Start Development Server

```bash
bun run dev
# or: npm run dev
```

The app will be available at **http://localhost:5173**

### Step 4: Verify Setup

1. Navigate to `http://localhost:5173`
2. You should see the MooreSkillUp landing page
3. Click "Get Started" → You'll be taken to the registration page
4. Sign up with test credentials (stored in localStorage)
5. Explore the dashboard, courses, lessons, and quizzes

---

## 📁 Project Structure

```
mooreskillup-dashboard/
├── src/
│   ├── routes/                  # File-based routing (TanStack Router)
│   │   ├── __root.tsx          # Root layout & error boundary
│   │   ├── index.tsx           # Landing page
│   │   ├── dashboard.tsx       # Main dashboard (authenticated)
│   │   ├── courses.tsx         # Courses listing
│   │   ├── course.$id.tsx      # Course details & modules
│   │   ├── lesson.$id.tsx      # Individual lesson
│   │   ├── quiz.$id.tsx        # Quiz page
│   │   ├── certificates.tsx    # User certificates
│   │   ├── leaderboard.tsx     # Global rankings
│   │   ├── achievements.tsx    # Badges & achievements
│   │   ├── login.tsx           # Login form
│   │   ├── register.tsx        # Registration form
│   │   ├── settings.tsx        # User preferences
│   │   └── contact.tsx         # Contact page (NEW)
│   │
│   ├── components/
│   │   ├── dashboard/          # Feature-specific components
│   │   │   ├── AppShell.tsx    # Main layout wrapper
│   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   ├── TopNavbar.tsx   # Header bar
│   │   │   ├── CourseCard.tsx  # Course preview
│   │   │   ├── LessonCard.tsx  # Lesson preview
│   │   │   ├── StreakWidget.tsx# Streak display
│   │   │   ├── BadgeIcon.tsx   # Badge display
│   │   │   └── ...
│   │   │
│   │   ├── ui/                 # shadcn/ui components (auto-generated)
│   │   │   └── *.tsx          # Radix UI primitives
│   │   │
│   │   └── ui-kit/             # Custom reusable components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── ProgressBar.tsx
│   │
│   ├── hooks/
│   │   └── use-mobile.tsx      # Mobile breakpoint detection
│   │
│   ├── lib/
│   │   ├── auth.tsx            # Auth context & mock functions
│   │   ├── mock-data.ts        # Sample user/course data
│   │   ├── quiz-data.ts        # Sample quiz questions
│   │   ├── theme.tsx           # Dark mode provider
│   │   ├── gamification.ts     # Badge & streak logic
│   │   ├── certificate.ts      # PDF generation
│   │   └── utils.ts            # Utility functions
│   │
│   ├── router.tsx              # Router setup
│   ├── routeTree.gen.ts        # Auto-generated route tree
│   └── styles.css              # Global styles (Tailwind config)
│
├── public/                      # Static assets
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── README.md                   # Quick start
```

### Key Directories Explained

| Directory | Purpose |
|-----------|---------|
| `src/routes/` | Page components (one file = one route, e.g., `lesson.$id.tsx` = `/lesson/:id`) |
| `src/components/dashboard/` | Shared layout components (Sidebar, TopNavbar, etc.) |
| `src/lib/` | Business logic, mock data, utilities |
| `src/lib/mock-data.ts` | All hardcoded data (to be replaced by API calls) |

---

## 🎯 Features Overview

### 1. Authentication
- **Location**: [`src/lib/auth.tsx`](src/lib/auth.tsx)
- **Routes**: `/login`, `/register`, `/settings`
- **Currently**: Mock authentication using localStorage
- **To Integrate**: Replace with JWT tokens from Django backend

### 2. Courses & Lessons
- **Location**: [`src/routes/courses.tsx`](src/routes/courses.tsx), [`src/routes/course.$id.tsx`](src/routes/course.$id.tsx)
- **Features**: 
  - Browse all courses
  - View course modules and lessons
  - Mark lessons as complete
  - Lesson status: Locked/Unlocked/Completed
- **Data Source**: [`src/lib/mock-data.ts`](src/lib/mock-data.ts)

### 3. Quiz System
- **Location**: [`src/routes/quiz.$id.tsx`](src/routes/quiz.$id.tsx)
- **Features**:
  - Multiple-choice questions
  - Instant feedback
  - Pass/fail scoring
  - Points reward
- **Data Source**: [`src/lib/quiz-data.ts`](src/lib/quiz-data.ts)

### 4. Certificates
- **Location**: [`src/routes/certificates.tsx`](src/routes/certificates.tsx)
- **Features**:
  - Auto-generated PDF certificates
  - Downloadable
  - Dynamic name/course info
- **Library**: jsPDF

### 5. Leaderboard
- **Location**: [`src/routes/leaderboard.tsx`](src/routes/leaderboard.tsx)
- **Features**:
  - Ranked podium (Top 3)
  - Full standings table
  - Current user highlighting
  - Points-based ranking

### 6. Achievements & Badges
- **Location**: [`src/routes/achievements.tsx`](src/routes/achievements.tsx)
- **Features**:
  - 8 collectible badges
  - Earned/locked states
  - Badge reveal animations
- **Logic**: [`src/lib/gamification.ts`](src/lib/gamification.ts)

### 7. Streak Tracking
- **Location**: Dashboard widget ([`src/components/dashboard/StreakWidget.tsx`](src/components/dashboard/StreakWidget.tsx))
- **Features**:
  - 7-day visualization
  - Longest streak tracking
  - Daily activity log

---

## 🔌 API Integration

### Current State
- All data is in **memory (mock data)** in `src/lib/mock-data.ts`
- No backend connection
- Perfect for testing UI without backend setup

### Integration Steps

#### Step 1: Update Auth Context
Replace mock auth in `src/lib/auth.tsx`:

```typescript
// BEFORE (mock)
const loginUser = (email: string, password: string) => {
  const user = MOCK_USERS.find(u => u.email === email);
  // ...
};

// AFTER (Django API)
const loginUser = async (email: string, password: string) => {
  const response = await fetch('https://api.mooreskillup.com/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = await response.json();
  localStorage.setItem('token', token);
  setCurrentUser(user);
};
```

#### Step 2: Create API Client
Create `src/lib/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = {
  // Courses
  async getCourses() {
    const res = await fetch(`${API_BASE}/courses/`);
    return res.json();
  },

  async getCourse(id: string) {
    const res = await fetch(`${API_BASE}/courses/${id}/`);
    return res.json();
  },

  // Quizzes
  async getQuiz(id: string) {
    const res = await fetch(`${API_BASE}/quizzes/${id}/`);
    return res.json();
  },

  async submitQuizAnswer(quizId: string, answers: Record<string, string>) {
    const res = await fetch(`${API_BASE}/quizzes/${quizId}/submit/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ answers }),
    });
    return res.json();
  },

  // ... more endpoints
};
```

#### Step 3: Use TanStack Query (React Query)
Replace direct mock data with API calls using `@tanstack/react-query`:

```typescript
import { useQuery } from '@tanstack/react-query';

function CoursesPage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.getCourses(),
  });

  if (isLoading) return <Spinner />;
  return <CoursesList courses={courses} />;
}
```

---

## 🚀 Deployment Guide

### Development Build
```bash
bun run build:dev
```

### Production Build
```bash
bun run build
```

Creates optimized bundle in `dist/`

### Deploy Options

#### Option 1: Cloudflare Pages (Recommended)
This project is configured for Cloudflare with `wrangler.jsonc`:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Deploy
wrangler pages deploy dist
```

#### Option 2: Vercel
```bash
npm install -g vercel
vercel
```

#### Option 3: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option 4: Self-hosted (Docker)
Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

Build and run:
```bash
docker build -t mooreskillup .
docker run -p 3000:3000 mooreskillup
```

### Environment Variables
Create `.env.local`:

```env
VITE_API_URL=https://api.mooreskillup.com
VITE_FORMSPREE_FORM_ID=<your-formspree-id>
VITE_WHATSAPP_NUMBER=<your-whatsapp-number>
```

---

## 🐛 Troubleshooting

### Port 5173 Already in Use
```bash
# Kill the process
# On Mac/Linux:
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Dependencies Not Installing
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Routes Not Generating
The `routeTree.gen.ts` is auto-generated. If routes don't appear:
```bash
# TanStack Router CLI should auto-generate on file save
# If not, manually trigger with Vite reload
```

### Dark Mode Not Working
Check `src/lib/theme.tsx` and ensure ThemeProvider wraps the app in `src/routes/__root.tsx`

### Build Errors
```bash
# Clear Vite cache
rm -rf .vite node_modules/.vite

# Rebuild
bun run build
```

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the [Django Backend Integration Guide](DJANGO_INTEGRATION.md)
3. See the [API Schema Documentation](API_SCHEMA.md)

---

**Last Updated**: April 2026  
**Maintainer**: MooreSkillUp Team
