# Security Guide

## Baseline controls

- Session-backed JWT auth
- HttpOnly refresh cookies
- Route protection at the edge and backend
- RBAC on admin APIs
- Rate limiting for sensitive endpoints
- Secure secrets handling
- Audit logging for admin actions

## Production expectations

- Use HTTPS everywhere
- Lock CORS to known domains
- Keep secrets out of source control
- Scan dependencies and images
- Restrict storage and database access

