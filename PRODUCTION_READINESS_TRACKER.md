# MooreSkillUp Production Readiness Tracker

> Living checklist for the full launch audit.
> We will update this as issues are fixed and features are verified.

## Status Legend
- `✅ Done`
- `🟡 In progress`
- `⬜ Not started`

## Baseline
- Backend coverage is strong in auth, payments, notifications, certificates, and RBAC.
- Frontend auth/session protection has now been hardened and migrated off localStorage tokens.
- We are treating production readiness as a launch-blocking checklist, not a cosmetic review.

## 1) Executive Summary
- [ ] Confirm production scope and launch criteria
- [ ] Confirm which features must ship at launch
- [ ] Define which placeholder routes are allowed to remain hidden
- [ ] Confirm go/no-go owners for final signoff

## 2) UI/UX Review
- [ ] Fix any broken copy/encoding artifacts
- [ ] Standardize button, modal, toast, and empty-state patterns
- [ ] Replace browser confirm/prompt dialogs with accessible components
- [ ] Validate desktop and mobile responsiveness across all major pages
- [ ] Verify dashboard density is usable on smaller screens
- [ ] Review landing page call-to-actions and navigation clarity

## 3) Feature Completion Status
- [ ] Verify landing page is launch-ready
- [ ] Verify authentication flows are complete
- [ ] Verify student onboarding is complete
- [ ] Verify teacher onboarding is complete
- [ ] Verify admin onboarding is complete
- [ ] Verify dashboards are complete for all roles
- [ ] Verify course, assignment, attendance, notifications, messaging, settings, and reports flows

## 4) Missing Features
- [ ] Decide on placeholder feature handling for:
  - `achievements`
  - `leaderboard`
  - `quiz-shop`
  - `quiz/[id]`
- [ ] Confirm whether teacher self-service onboarding is required
- [ ] Confirm whether any unsupported workflows should be hidden from navigation

## 5) Backend Integration Status
- [x] Verify frontend-to-backend integration for auth
- [ ] Verify course data is live, not mock-backed
- [ ] Verify payments use real API integration
- [ ] Verify notifications and broadcasts are fully connected
- [ ] Verify certificates generate and verify correctly
- [ ] Verify file upload flows, if any, are production-safe
- [ ] Verify all role dashboards read from real APIs

## 6) Security Review
- [x] Remove client-trusted auth cookie reliance
- [x] Enforce server-side route protection
- [x] Confirm JWT storage and refresh strategy is secure
- [x] Confirm role-based access control is enforced on the backend
- [x] Confirm password reset and email verification are safe
- [x] Confirm rate limiting and lockout behavior
- [x] Confirm CSRF/CORS/session behavior in production

## 7) Performance Review
- [ ] Review heavy client-rendered pages for bundle size
- [ ] Review large lists for pagination and filtering performance
- [ ] Confirm skeleton/loading states appear quickly
- [ ] Check for avoidable duplicate API calls
- [ ] Confirm dashboard and editor pages stay responsive on slower devices

## 8) Accessibility Review
- [ ] Restore browser zoom support
- [ ] Check keyboard navigation on all forms and menus
- [ ] Check focus states across all buttons and inputs
- [ ] Ensure dialogs, tabs, and tables are accessible
- [ ] Check color contrast across dark and light themes
- [ ] Verify screen-reader labels and error messaging

## 9) Code Quality Review
- [x] Consolidate duplicated auth/API client logic
- [ ] Remove or quarantine dead routes/components
- [ ] Normalize error handling across pages
- [ ] Normalize loading and empty states
- [ ] Reduce usage of ad hoc browser dialogs
- [ ] Review naming consistency and file organization

## 10) Database Review
- [x] Confirm schema supports all active roles and profiles
- [x] Confirm platform settings persistence is correct
- [ ] Confirm payments, certificates, notifications, and audit tables are sound
- [ ] Verify indexes and constraints for high-use tables
- [x] Verify migrations are safe to run in staging and production
- [ ] Confirm backup/restore plan

## 11) API Review
- [x] Verify auth endpoints are complete and secure
- [ ] Verify course endpoints cover every supported workflow
- [ ] Verify payments endpoints cover initialize, verify, webhook, refund
- [ ] Verify notification endpoints cover listing, read state, broadcast, and support
- [ ] Verify platform/admin endpoints are permission-safe
- [ ] Verify pagination/filtering/search where needed

## 12) Testing Recommendations
- [ ] Add end-to-end tests for auth and redirects
- [ ] Add end-to-end tests for role-based dashboards
- [ ] Add end-to-end tests for course publishing and purchase flows
- [ ] Add end-to-end tests for notification and certificate flows
- [ ] Add accessibility checks
- [ ] Add regression checks for placeholder routes and empty states

## 13) Deployment Readiness
- [x] Verify environment variables
- [x] Verify CORS and frontend URLs
- [x] Verify database connection and migrations
- [ ] Verify static/media storage
- [x] Verify email service settings
- [ ] Verify payment provider settings
- [ ] Verify logs and monitoring

## 14) Production Checklist
- [x] Auth/session behavior verified
- [ ] Role redirects verified
- [ ] All launch-critical pages verified
- [ ] All launch-critical APIs verified
- [ ] Security review passed
- [ ] Accessibility review passed
- [ ] Performance review passed
- [ ] Deployment checklist passed

## 15) Prioritized Action Plan

### Critical
- [x] Replace weak client-side auth protection
- [ ] Finish or hide placeholder routes
- [ ] Verify protected-page access control

### High Priority
- [ ] Fix onboarding gaps
- [ ] Improve loading/error/empty states
- [ ] Replace confirm/prompt dialogs

### Medium Priority
- [ ] Consolidate API clients
- [ ] Improve table/list performance
- [ ] Clean up copy and visual consistency

### Low Priority
- [ ] Polish minor UI details
- [ ] Optional enhancements and nice-to-haves

## Notes
- Add one checklist item per issue you discover.
- When we complete something, mark it `✅ Done` and add a short note if helpful.
- If a page or flow is intentionally out of scope, note that here so it is not revisited later.
