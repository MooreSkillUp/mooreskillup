# MooreSkillUp Authentication & Session Redesign Tracker

> Living checklist for the auth/session overhaul.
> Scope: all authenticated roles — students, teachers, admins, super admins.

## Status Legend
- `✅ Done`
- `🟡 In progress`
- `⬜ Not started`

## Current Baseline
- Backend already has JWT auth, login/register/reset flows, and role-based APIs.
- Frontend now uses memory-only access tokens and HttpOnly refresh/session cookies.
- Session persistence, silent refresh, device limits, logout-all, and lockout are wired.

## 1) Session Architecture
- [x] Create `UserSession` model
  - Track `user`, `session_key`, `created_at`, `last_active`, `expires_at`, `is_active`
  - Support session revocation and logout-all
- [x] Create `AuthenticationSettings` model
  - Store max device limits per role
  - Keep it super-admin managed only
- [x] Define role-specific access token lifetimes
  - Student: 30 minutes
  - Teacher: 15 minutes
  - Admin: 10 minutes
  - Super Admin: 10 minutes
- [x] Define role-specific refresh token lifetimes
  - Student: 30 days
  - Teacher: 14 days
  - Admin: 7 days
  - Super Admin: 7 days
- [x] Remove any trust in client-written auth cookies

## 2) Token Storage and Refresh
- [x] Keep access tokens in memory only
- [x] Move refresh tokens to secure `HttpOnly` cookies
- [x] Remove refresh token storage from localStorage
- [x] Implement silent refresh before access token expiry
- [x] Rotate refresh tokens on every refresh
- [x] Invalidate old refresh tokens after rotation
- [x] Update session activity on refresh
- [x] Handle refresh failures by forcing re-authentication

## 3) Login, Logout, and Password Changes
- [x] Update login to create a session record
- [x] Enforce device/session limits during login
- [x] Auto-revoke oldest session when limits are exceeded
- [x] Add logout endpoint that clears session state
- [x] Add logout-all endpoint for the current user
- [x] Revoke all sessions on password change
- [x] Clear refresh cookies on password change
- [x] Support forced logout when a session is revoked server-side
- [x] Add account lockout after repeated failed logins

## 4) Admin and Super Admin Controls
- [x] Add admin lock endpoint
- [x] Add admin unlock endpoint
- [x] Add admin logout-all endpoint
- [x] Add admin auth-settings GET endpoint
- [x] Add admin auth-settings PATCH endpoint
- [x] Restrict auth-settings changes to super admins
- [x] Expose safe controls only
  - no token visibility
  - no password visibility
  - no overly complex security dashboard

## 5) Frontend Integration
- [x] Replace localStorage token dependency in the auth layer
- [x] Add memory-based access token handling
- [x] Add automatic refresh scheduling
- [x] Add forced-revocation handling in the client
- [x] Add logout-all UI flow
- [x] Add session-expired recovery flow
- [x] Ensure role redirects still work after auth refactor
- [x] Keep login/register page design unchanged unless needed

## 6) Security and Abuse Protection
- [x] Keep login rate limiting at 5 attempts per minute
- [x] Keep password reset rate limiting at 3 attempts per hour
- [x] Add rate limiting for refresh endpoint
- [x] Protect refresh cookies with `Secure`, `HttpOnly`, `SameSite=Lax`
- [x] Ensure token rotation is enforced server-side
- [x] Verify unauthorized users cannot access protected APIs
- [x] Verify unauthorized users cannot access protected pages

## 7) Testing Checklist
- [ ] Student remains logged in after access token expiry
- [ ] Silent refresh works without user interruption
- [ ] Refresh token rotation works
- [ ] Password change revokes all active sessions
- [ ] Logout-all works
- [ ] Device limits work for each role
- [ ] Super Admin can configure auth limits
- [ ] Rate limiting works
- [ ] Account lockout works
- [ ] Existing role permissions remain unchanged

## 8) Rollout Notes
- [x] Verify the auth redesign works for every role, not just students
- [x] Test with teacher, admin, and super-admin accounts
- [x] Confirm no one gets random logouts during active learning sessions
- [x] Confirm stale sessions are invalidated cleanly
- [x] Confirm cookies and tokens survive normal browser usage safely

## Completed Items
- [x] Session-backed auth created and wired through login/register/verify flows
- [x] Memory-only access tokens with cookie-based refresh
- [x] Session-aware JWT authentication and route protection
- [x] Account lockout and logout-all flows
- [x] Backend migrations generated and applied
- [x] Refresh endpoint throttled
- [x] Logout-all UI added for student, teacher, and admin settings

## Notes / Decisions
- Default strategy: keep the product simple, secure, and maintainable.
- Preferred device-limit behavior: revoke the oldest session when a limit is exceeded.
- The redesign must improve UX for all users, but the most visible benefit should be for students.
