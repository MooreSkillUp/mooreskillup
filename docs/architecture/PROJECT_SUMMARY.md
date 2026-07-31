# Project Summary

## Current state

The repo is now a clean Next.js project.

- active frontend lives in `src/app`
- old Vite and TanStack Router files were removed
- lint passes
- typecheck passes
- production build passes

## Product scope already implemented in the frontend

- public landing page
- auth screens
- dashboard shell
- courses and lessons
- quizzes
- certificates
- leaderboard
- achievements
- settings
- contact page

## What is still mock-only

- authentication
- course catalog data
- lesson progress persistence
- quiz submissions
- leaderboard persistence
- achievement unlock logic
- certificate eligibility persistence

## What the backend needs to provide

- token-based auth
- user profile and enrollment state
- courses, modules, lessons, and lesson completion
- quizzes and quiz submissions
- user stats, achievements, and leaderboard
- certificate issuance records

## Best next move

Follow [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md) and build the backend in this order:

1. auth and users
2. course catalog
3. lesson progress
4. quizzes
5. gamification and certificates

Then replace the mock modules in `src/lib` with API calls.
