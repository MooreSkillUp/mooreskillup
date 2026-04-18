# 📚 Documentation Index

Complete guide to all MooreSkillUp documentation.

---

## Quick Navigation

### 🚀 Getting Started (Read These First)

1. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** ⭐ START HERE
   - Project overview & architecture
   - Local development setup (5 minutes)
   - Project structure walkthrough
   - Feature overview
   - Deployment options

2. **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** ⭐ MASTER GUIDE
   - Complete development workflow
   - Feature guide (how each feature works)
   - Backend integration tutorial
   - Deployment checklist
   - Troubleshooting guide

---

## 🔌 Backend & API

### For Django Developers

3. **[DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md)** - Step-by-Step Backend Setup
   - Django project setup (4-6 hours)
   - Database models (7 apps)
   - REST API architecture
   - JWT authentication
   - Complete integration checklist

4. **[API_SCHEMA.md](API_SCHEMA.md)** - API Reference
   - All endpoint specifications
   - Request/response examples
   - Error handling
   - Rate limiting
   - Pagination details
   - Authentication flow

---

## 🎨 Features & Configuration

### Specific Feature Guides

5. **[FORMSPREE_SETUP.md](FORMSPREE_SETUP.md)** - Contact Form Integration
   - Free email service setup (works without backend!)
   - Step-by-step Formspree configuration
   - WhatsApp button setup
   - Troubleshooting contact forms
   - Advanced options (Slack, multiple emails)

---

## 📋 What's Where?

### Frontend Features

| Feature | Location | Relevant Docs |
|---------|----------|---------------|
| **Landing Page** | `src/routes/index.tsx` | SETUP_GUIDE.md |
| **Dashboard** | `src/routes/dashboard.tsx` | DEVELOPMENT_ROADMAP.md |
| **Courses** | `src/routes/courses.tsx` + `course.$id.tsx` | SETUP_GUIDE.md, DJANGO_INTEGRATION.md |
| **Lessons** | `src/routes/lesson.$id.tsx` | SETUP_GUIDE.md, API_SCHEMA.md |
| **Quizzes** | `src/routes/quiz.$id.tsx` | SETUP_GUIDE.md, API_SCHEMA.md |
| **Certificates** | `src/routes/certificates.tsx` | SETUP_GUIDE.md |
| **Leaderboard** | `src/routes/leaderboard.tsx` | SETUP_GUIDE.md, API_SCHEMA.md |
| **Achievements** | `src/routes/achievements.tsx` | SETUP_GUIDE.md |
| **Contact Form** | `src/routes/contact.tsx` | FORMSPREE_SETUP.md |
| **Pricing** | `src/routes/index.tsx` (pricing section) | DEVELOPMENT_ROADMAP.md |
| **Authentication** | `src/lib/auth.tsx` | SETUP_GUIDE.md, DJANGO_INTEGRATION.md |
| **Settings** | `src/routes/settings.tsx` | SETUP_GUIDE.md |

### Backend Components

| Component | Framework | Relevant Doc |
|-----------|-----------|--------------|
| **Database Models** | Django ORM | DJANGO_INTEGRATION.md |
| **REST Endpoints** | Django REST Framework | API_SCHEMA.md |
| **Authentication** | JWT (SimpleJWT) | DJANGO_INTEGRATION.md |
| **Email** | Formspree (no backend needed!) | FORMSPREE_SETUP.md |

---

## 🎯 Common Tasks & Which Doc to Read

### I want to...

**Get started immediately**
→ Read: [SETUP_GUIDE.md](SETUP_GUIDE.md) #Quick Start section

**Understand the whole project**
→ Read: [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Project Organization

**Build the Django backend**
→ Read: [DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md) (4-6 hour guide)

**Connect frontend to Django API**
→ Read: [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Backend Integration

**Know all API endpoints**
→ Read: [API_SCHEMA.md](API_SCHEMA.md) (complete reference)

**Set up contact form**
→ Read: [FORMSPREE_SETUP.md](FORMSPREE_SETUP.md)

**Add a new feature**
→ Read: [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Development Workflow

**Deploy to production**
→ Read: [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Deployment Checklist

**Troubleshoot an issue**
→ Read: [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Troubleshooting

---

## 📖 Reading Path by Role

### Frontend Developer
```
1. SETUP_GUIDE.md - Get running locally
2. DEVELOPMENT_ROADMAP.md - Understand project structure
3. Make changes to React components
```

### Full-Stack Developer
```
1. SETUP_GUIDE.md - Front-end overview
2. DJANGO_INTEGRATION.md - Build backend (4-6 hours)
3. API_SCHEMA.md - Reference while integrating
4. DEVELOPMENT_ROADMAP.md #Backend Integration - Connect frontend
```

### Designer/Product Manager
```
1. SETUP_GUIDE.md #Features Overview - See what's built
2. DEVELOPMENT_ROADMAP.md #Feature Guide - Understand how it works
3. Navigate the live app at http://localhost:5173
```

### DevOps Engineer
```
1. SETUP_GUIDE.md #Deployment Guide - Frontend deployment options
2. DEVELOPMENT_ROADMAP.md #Deployment Checklist - Pre-launch checks
3. DJANGO_INTEGRATION.md #Deployment - Backend deployment
```

---

## 🔍 File Structure Reference

```
mooreskillup-dashboard/
├── README.md                      # Quick overview
├── SETUP_GUIDE.md                ⭐ START HERE (local setup)
├── DEVELOPMENT_ROADMAP.md        ⭐ MASTER GUIDE
├── DJANGO_INTEGRATION.md         (backend guide)
├── API_SCHEMA.md                 (API reference)
├── FORMSPREE_SETUP.md            (contact form)
├── DOCUMENTATION_INDEX.md        (you are here)
│
├── src/
│   ├── routes/                   (pages/routes)
│   ├── components/               (React components)
│   ├── lib/                      (data & utilities)
│   └── ...
│
├── package.json                  (dependencies)
├── tsconfig.json                 (TypeScript config)
├── tailwind.config.js            (styling)
├── vite.config.ts                (build config)
└── .env.example                  (environment template)
```

---

## 🆘 Frequently Asked Questions

**Q: What do I read first?**  
A: Start with [SETUP_GUIDE.md](SETUP_GUIDE.md) #Quick Start section

**Q: How do I set up the backend?**  
A: Follow [DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md) (4-6 hour tutorial)

**Q: How do I know what API endpoints exist?**  
A: See [API_SCHEMA.md](API_SCHEMA.md) for complete endpoint reference

**Q: Can I use this without a backend?**  
A: Yes! Frontend works with mock data. Eventually you'll want [DJANGO_INTEGRATION.md](DJANGO_INTEGRATION.md) for production.

**Q: How do I set up the contact form?**  
A: See [FORMSPREE_SETUP.md](FORMSPREE_SETUP.md) - it's free and requires no backend!

**Q: What's the project tech stack?**  
A: React 19, TypeScript, TanStack Router, Tailwind CSS, Django REST (backend)

**Q: How do I deploy?**  
A: See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) #Deployment Checklist or [SETUP_GUIDE.md](SETUP_GUIDE.md) #Deployment Guide

---

## 📞 Documentation Maintenance

### Document Purposes

| Document | Audience | Depth | Time to Read |
|----------|----------|-------|--------------|
| README.md | Everyone | Quick | 2 min |
| SETUP_GUIDE.md | Developers | Complete | 15 min |
| DEVELOPMENT_ROADMAP.md | Developers | Comprehensive | 30 min |
| DJANGO_INTEGRATION.md | Backend devs | Complete | 2-3 hours |
| API_SCHEMA.md | All devs | Reference | 15 min (per feature) |
| FORMSPREE_SETUP.md | Developers | Specific | 10 min |
| DOCUMENTATION_INDEX.md | Everyone | Navigation | 5 min |

---

## ✅ Checklist: Using These Docs

- [ ] Read appropriate documentation for your role
- [ ] Keep `.env.example` as reference for configuration
- [ ] Bookmark this index for quick navigation
- [ ] Reference API_SCHEMA.md while developing
- [ ] Follow DEVELOPMENT_ROADMAP.md for workflow
- [ ] Use Troubleshooting section when stuck
- [ ] Share SETUP_GUIDE.md with new team members

---

## 🎓 Learning Path

### Week 1: Frontend Development
- Day 1: Read SETUP_GUIDE.md, get running locally
- Day 2-3: Explore codebase, understand components
- Day 4: Read DEVELOPMENT_ROADMAP.md Feature Guide
- Day 5: Make a small feature change

### Week 2-3: Backend Development
- Day 1-2: Read DJANGO_INTEGRATION.md models section
- Day 3-4: Build Django backend (models, serializers, views)
- Day 5-7: Test API endpoints, fix issues

### Week 4: Integration & Deployment
- Day 1-3: Connect frontend to backend API
- Day 4-5: Full-stack testing
- Day 6-7: Deploy to production using Deployment Checklist

---

## 🔗 External Resources

### Tools & Services Referenced

- **[Formspree](https://formspree.io)** - Contact form emails (free!)
- **[WhatsApp API](https://www.whatsapp.com/business/api)** - Direct messaging
- **[Django](https://www.djangoproject.com/)** - Backend framework
- **[Django REST Framework](https://www.django-rest-framework.org/)** - API builder
- **[React Documentation](https://react.dev)** - Framework docs
- **[TanStack Router](https://tanstack.com/router)** - Routing docs
- **[Tailwind CSS](https://tailwindcss.com)** - Styling docs
- **[Framer Motion](https://www.framer.com/motion)** - Animation docs

---

**Last Updated**: April 2026  
**Maintained By**: MooreSkillUp Docs Team

💡 **Pro Tip**: Bookmark this page for easy access to all documentation!
